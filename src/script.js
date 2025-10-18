const BASE_URL = "http://shivam-mac.local:3465/api/v1.0";

const PAGE_SIZES = {
  LARGE: { width: 100, height: 50 }, // 100mm x 50mm
  MEDIUM: { width: 100, height: 25 }, // 100mm x 25mm
  SMALL: { width: 25, height: 25 }, // 25mm x 25mm
};

document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("qr-code-file");
  const printButton = document.getElementById("bulk-print-button");
  const qr_code = document.getElementById("qr-code");
  const custom_text = document.getElementById("custom-text");
  const generateButton = document.getElementById("generate-qr");
  const validationMessage = document.getElementById("qr-validation-message");
  const qrPreview = document.getElementById("qr-preview");

  let bulkGeneratedQRs = null;

  // Print Controls
  const widthInput = document.getElementById("qr-width");
  const heightInput = document.getElementById("qr-height");
  const perRowInput = document.getElementById("per-row");
  const quantityInput = document.getElementById("quantity");
  const printSingleButton = document.getElementById("print-single-button");
  const pageSizeSelect = document.getElementById("page-size");
  const testPrinterButton = document.getElementById("test-printer-button");

  testPrinterButton.addEventListener("click", () => {
    printWindow = window.open("", "_blank");

    printWindow.document.write(`
      <html>
        <head>
          <style>
            @page {
              margin: 0;
              padding: 0;
              width: 100mm;
              height: 50mm;
            }
            body {
              margin: 0;
              padding: 0;
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            img {
              max-width: 100%;
              width: 50mm;
              height: 50mm;
              display: block;
            }
          </style>
        </head>
        <body>
          <img src="./assets/test_qr.png" alt="test" />
        </body>
      </html>
    `);

    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  });

  console.log(qr_code);

  qr_code.addEventListener("input", validateQRInput);
  generateButton.addEventListener("click", createQR);

  printButton.addEventListener("click", handleBulkPrint);
  printSingleButton.addEventListener("click", printSingle);

  //   Add event listeners for controls to update preview
  widthInput.addEventListener("input", updatePreview);
  heightInput.addEventListener("input", updatePreview);
  perRowInput.addEventListener("input", updatePreview);
  quantityInput.addEventListener("input", updatePreview);
  pageSizeSelect.addEventListener("change", updatePageSize);

  let lastImageUrl = null;
  let lastCode = "";
  let lastCustomText = "";

  function updatePageSize() {
    const selectedSize = PAGE_SIZES[pageSizeSelect.value];

    // Update width/height inputs
    widthInput.value = selectedSize.width;
    heightInput.value = selectedSize.height;

    // Update preview
    if (bulkGeneratedQRs) {
      updateBulkPreview();
    } else {
      updatePreview();
    }
  }

  function updatePreview() {
    const previewContainer = document.getElementById("qr-codes");
    if (!lastImageUrl) {
      return; // No QR code generated yet
    }

    const qty = Math.max(1, parseInt(quantityInput?.value, 10) || 1);
    const hasCustomText = lastCustomText.trim() !== "";
    const defaultWidth = hasCustomText ? "100" : "50";
    const defaultHeight = hasCustomText ? "50" : "25";
    const defaultPerRow = hasCustomText ? 1 : 2;
    const widthMm = parseFloat(widthInput?.value) || defaultWidth;
    const heightMm = parseFloat(heightInput?.value) || defaultHeight;
    const perRow = Math.max(
      1,
      parseInt(perRowInput?.value, 10) || defaultPerRow
    );

    // Clear previous preview
    previewContainer.innerHTML = "";

    // Create preview grid
    const grid = document.createElement("div");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = `repeat(${perRow}, ${widthMm}mm)`;
    // grid.style.gap = "1rem";
    // grid.style.marginTop = "0.5mm";
    grid.style.marginLeft = "1mm";
    grid.style.alignItems = "center";
    grid.style.justifyItems = "center";

    // Create QR codes based on quantity
    for (let i = 0; i < qty; i++) {
      const qrContainer = document.createElement("div");
      // qrContainer.style.border = "1px solid #e5e7eb";

      const img = document.createElement("img");
      img.src = lastImageUrl;
      img.alt = lastCode;
      img.style.width = `${widthMm}mm`;
      img.style.height = `${heightMm}mm`;

      qrContainer.appendChild(img);
      grid.appendChild(qrContainer);
    }

    previewContainer.appendChild(grid);
  }

  function validateQRInput() {
    const value = qr_code.value.trim();

    validationMessage.textContent = "";

    if (!value) return;

    const isNumeric12Digit = /^\d{12}$/.test(value);
    const isAlphaNumeric9Digit = /^[a-zA-Z0-9]{9}$/.test(value);

    if (!isNumeric12Digit && !isAlphaNumeric9Digit) {
      validationMessage.textContent = "Click on generate to create this QR";
      return false;
    }

    return true;
  }

  async function createQR() {
    console.log("createQR called");
    try {
      const value = qr_code.value.trim();
      const hasCustomText = custom_text.value.trim() !== "";

      if (!value) {
        validationMessage.textContent = "Please enter a QR code";
        return;
      }

      const res = await fetch(`${BASE_URL}/qr-m2m/create-qr-without-db-save/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: qr_code.value,
          qr_without_text: !hasCustomText,
          text_content: custom_text.value,
        }),
      });

      if (!res) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      // Get the blob from response
      const qr_blob = await res.blob();

      // Create object URL from blob and store it
      if (lastImageUrl) {
        // revoke previous
        URL.revokeObjectURL(lastImageUrl);
      }
      lastImageUrl = URL.createObjectURL(qr_blob);
      lastCode = value;
      lastCustomText = custom_text.value || "";

      printSingleButton.disabled = false;
      quantityInput.disabled = false;

      const defaultWidth = hasCustomText ? "100" : "50";
      widthInput.value = defaultWidth;

      perRowInput.value = hasCustomText ? 1 : 2;

      // Update height to match width for QR without text
      if (!hasCustomText) {
        heightInput.value = "50";
      }

      // Update QR preview using the blob URL
      if (qrPreview) {
        qrPreview.src = lastImageUrl;
        qrPreview.style.width = `${defaultWidth}mm`;
        qrPreview.style.height = `${heightInput.value}mm`;
      }

      updatePreview();

      validationMessage.textContent = "";
    } catch (error) {
      console.error("Error fetching QR data:", error);
      custom_text.value = "";
      validationMessage.textContent = "Error generating QR code";
    }
  }

  async function handleBulkPrint() {
    try {
      // If QRs are already generated, proceed to print
      if (bulkGeneratedQRs) {
        createPrintView(bulkGeneratedQRs);
        return;
      }

      const file = fileInput.files[0];
      if (!file) {
        alert("Please select a file first");
        return;
      }

      const withCustomText =
        document.getElementById("with-custom-text").checked;

      const data = await readFile(file);

      // validate required columns
      if (!validateColumns(data)) {
        alert("File must contain columns: 'QR Code', 'Quantity'");
        return;
      }

      printButton.textContent = "Generating...";
      printButton.disabled = true;

      const processedData = await Promise.all(
        data.map(async (row) => {
          // Generate QR from API
          const res = await fetch(
            `${BASE_URL}/qr-m2m/create-qr-without-db-save/`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                code: row["QR Code"],
                qr_without_text: !withCustomText,
                text_content: row["Custom Text"] || "",
              }),
            }
          );

          if (!res) {
            throw new Error(
              `Failed to generate QR for code: ${row["QR Code"]}`
            );
          }

          const blob = await res.blob();
          return {
            ...row,
            imageUrl: URL.createObjectURL(blob),
            hasCustomText: withCustomText,
          };
        })
      );

      bulkGeneratedQRs = processedData;

      printButton.textContent = "Print Bulk QR Codes";
      printButton.disabled = false;
      printSingleButton.disabled = true;
      quantityInput.disabled = true;

      updateBulkPreview();
    } catch (error) {
      console.error("Error processing bulk print:", error);
      alert("Error processing bulk print");
      printButton.textContent = "Generate Bulk QR";
      printButton.disabled = false;
      quantityInput.disabled = false;
      printSingleButton.disabled = false;
    }
  }

  function updateBulkPreview() {
    const previewContainer = document.getElementById("qr-codes");
    if (!bulkGeneratedQRs) return;

    // Clear previous preview
    previewContainer.innerHTML = "";
    const withCustomText = document.getElementById("with-custom-text").checked;

    const selectedSize = PAGE_SIZES[pageSizeSelect.value];
    const grid = document.createElement("div");
    grid.style.display = "grid";
    const defaultPerRow = withCustomText ? 1 : 2;
    const perRow = parseInt(perRowInput.value) || defaultPerRow;
    grid.style.gridTemplateColumns = `repeat(${perRow}, auto)`;
    grid.style.width = `${selectedSize.width}mm`;
    grid.style.height = `${selectedSize.height}mm`;

    bulkGeneratedQRs.forEach((row) => {
      const quantity = parseInt(row.Quantity) || 1;
      const width = row.hasCustomText ? "100mm" : "50mm";
      const height = "50mm";

      for (let i = 0; i < quantity; i++) {
        const qrContainer = document.createElement("div");
        qrContainer.style.display = "flex";
        qrContainer.style.flexDirection = "column";
        qrContainer.style.alignItems = "center";

        const img = document.createElement("img");
        img.src = row.imageUrl;
        img.style.width = width;
        img.style.height = height;
        img.style.objectFit = "contain";

        qrContainer.appendChild(img);
        grid.appendChild(qrContainer);
      }
    });

    previewContainer.appendChild(grid);
  }

  // Update event listeners for controls to handle bulk preview
  widthInput.addEventListener("input", () => {
    if (bulkGeneratedQRs) {
      updateBulkPreview();
    } else {
      updatePreview();
    }
  });
  heightInput.addEventListener("input", () => {
    if (bulkGeneratedQRs) {
      updateBulkPreview();
    } else {
      updatePreview();
    }
  });
  perRowInput.addEventListener("input", () => {
    if (bulkGeneratedQRs) {
      updateBulkPreview();
    } else {
      updatePreview();
    }
  });

  // Add file input change handler to reset state
  fileInput.addEventListener("change", () => {
    bulkGeneratedQRs = null;
    printButton.textContent = "Generate Bulk QR";
    previewContainer.innerHTML = "";
  });

  function validateColumns(data) {
    if (!data || !data.length) return false;
    const firstRow = data[0];
    return ["QR Code", "Quantity"].every((col) => col in firstRow);
  }

  function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = function (e) {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const firstSheet = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);
        resolve(rows);
      };

      reader.onerror = reject;
      reader.readAsBinaryString(file);
    });
  }

  async function createPrintView(data) {
    const selectedSize = PAGE_SIZES[pageSizeSelect.value];
    const printContainer = document.createElement("div");
    printContainer.style.display = "grid";
    printContainer.style.gap = "0";
    printContainer.style.margin = "0";
    printContainer.style.padding = "0";

    let currentRow = document.createElement("div");
    currentRow.style.display = "flex";
    currentRow.style.flexDirection = "row";
    currentRow.style.margin = "0";
    currentRow.style.padding = "0";

    let itemsInCurrentRow = 0;

    for (const row of data) {
      const quantity = parseInt(row.Quantity) || 1;
      const width = row.hasCustomText ? "100mm" : "50mm";
      const height = "50mm";
      const perRow = row.hasCustomText ? 1 : 2;

      for (let i = 0; i < quantity; i++) {
        if (itemsInCurrentRow >= perRow) {
          printContainer.appendChild(currentRow);
          currentRow = document.createElement("div");
          currentRow.style.display = "flex";
          currentRow.style.flexDirection = "row";
          currentRow.style.margin = "0";
          currentRow.style.padding = "0";
          itemsInCurrentRow = 0;
        }

        const qrContainer = document.createElement("div");
        qrContainer.style.width = width;
        qrContainer.style.height = height;
        qrContainer.style.display = "flex";
        qrContainer.style.flexDirection = "column";
        qrContainer.style.alignItems = "center";
        qrContainer.style.justifyContent = "center";
        qrContainer.style.margin = "0";
        qrContainer.style.padding = "0";

        const img = document.createElement("img");
        img.src = row.imageUrl;
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "contain";

        qrContainer.appendChild(img);
        currentRow.appendChild(qrContainer);
        itemsInCurrentRow++;
      }
    }

    if (itemsInCurrentRow > 0) {
      printContainer.appendChild(currentRow);
    }

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
        <html>
            <head>
                <style>
                    @page {
                        margin: 0;
                        padding: 0;
                        width: ${selectedSize.width}mm;
                        height: ${selectedSize.height}mm;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                    }
                    img {
                        max-width: 100%;
                        height: auto;
                        display: block;
                    }
                    .row {
                        display: flex;
                        flex-direction: row;
                        margin: 0;
                        padding: 0;
                        height: ${selectedSize.height}mm;
                    }
                    .qr-container {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        margin: 0;
                        padding: 0;
                        width: ${selectedSize.width / 2}mm;
                        height: ${selectedSize.height}mm;
                    }
                </style>
            </head>
            <body>
                ${printContainer.outerHTML}
            </body>
        </html>
    `);

    printWindow.document.close();

    // Clean up object URLs after printing
    printWindow.onafterprint = () => {
      data.forEach((row) => {
        if (row.imageUrl) {
          URL.revokeObjectURL(row.imageUrl);
        }
      });
    };

    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  }

  function printSingle() {
    if (!lastImageUrl) {
      validationMessage.textContent = "Generate a QR first";
      return;
    }

    const selectedSize = PAGE_SIZES[pageSizeSelect.value];
    const previewContainer = document.getElementById("qr-codes");

    // Create print window with current preview layout
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
        <html>
            <head>
                <link rel="stylesheet" href="output.css">
                <style>
                    @media print {
                        @page { margin: 0;
                        width: ${selectedSize.width}mm;
                        height: ${selectedSize.height}mm;
                        }
                        body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                        img { 
                            max-width: 100%;
                            height: 100%;
                            object-fit: contain;
                        }
                    }
                    body { margin: 0; padding: 0; }
                </style>
            </head>
            <body>
                ${previewContainer.innerHTML}
            </body>
        </html>
    `);
    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      setTimeout(() => {
        if (lastImageUrl) {
          URL.revokeObjectURL(lastImageUrl);
          lastImageUrl = null;
        }
      }, 3000);
    };
  }
});
