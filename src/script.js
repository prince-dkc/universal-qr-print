const BASE_URL = "http://shivam-mac.local:3465/api/v1.0";

document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("qr-code-file");
  const printButton = document.getElementById("bulk-print-button");
  const qr_code = document.getElementById("qr-code");
  const custom_text = document.getElementById("custom-text");
  const generateButton = document.getElementById("generate-qr");
  const validationMessage = document.getElementById("qr-validation-message");
  const qrPreview = document.getElementById("qr-preview");

  // Print Controls
  const widthInput = document.getElementById("qr-width");
  const heightInput = document.getElementById("qr-height");
  const perRowInput = document.getElementById("per-row");
  const quantityInput = document.getElementById("quantity");
  const printSingleButton = document.getElementById("print-single-button");

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

  let lastImageUrl = null;
  let lastCode = "";
  let lastCustomText = "";

  function updatePreview() {
    const previewContainer = document.getElementById("qr-codes");
    if (!lastImageUrl) {
      return; // No QR code generated yet
    }

    const qty = Math.max(1, parseInt(quantityInput?.value, 10) || 1);
    const hasCustomText = lastCustomText.trim() !== "";
    const defaultWidth = hasCustomText ? "3.93in" : "1.96in";
    const defaultPerRow = hasCustomText ? 1 : 2;
    const widthIn = parseFloat(widthInput?.value) || defaultWidth;
    const heightIn = parseFloat(heightInput?.value) || "1.96in";
    const perRow = Math.max(
      1,
      parseInt(perRowInput?.value, 10) || defaultPerRow
    );

    // Clear previous preview
    previewContainer.innerHTML = "";

    // Create preview grid
    const grid = document.createElement("div");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = `repeat(${perRow}, ${widthIn}in)`;
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
      img.style.width = `${widthIn}in`;
      img.style.height = `${heightIn}in`;

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

      const defaultWidth = hasCustomText ? "3.93" : "1.96";
      widthInput.value = defaultWidth;

      const defaultPerRow = hasCustomText ? 1 : 2;
      perRowInput.value = defaultPerRow;

      // Update height to match width for QR without text
      if (!hasCustomText) {
        heightInput.value = "1.96";
      }

      // Update QR preview using the blob URL
      if (qrPreview) {
        qrPreview.src = lastImageUrl;
        qrPreview.style.width = `${defaultWidth}in`;
        qrPreview.style.height = `${heightInput.value}in`;
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
    const file = fileInput.files[0];
    if (!file) {
      alert("Please select a file first");
      return;
    }

    const data = await readFile(file);

    const widthIn = parseFloat(widthInput?.value) || "1.96in";
    const heightIn = parseFloat(heightInput?.value) || "1.96in";
    const perRow = Math.max(1, parseInt(perRowInput?.value, 10) || 2);

    createPrintView(data, { widthIn, heightIn, perRow });
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

  async function createPrintView(data, options = {}) {
    const widthIn =
      options.widthIn || parseFloat(widthInput?.value) || "1.96in";
    const heightIn =
      options.heightIn || parseFloat(heightInput?.value) || "1.96in";
    const perRow =
      options.perRow || Math.max(1, parseInt(perRowInput?.value, 10) || 2);

    const printContainer = document.createElement("div");
    printContainer.className = "grid";
    printContainer.style.display = "grid";
    printContainer.style.gridTemplateColumns = `repeat(${perRow}, 1fr)`;
    // printContainer.style.gap = "0.5in";

    for (const row of data) {
      const quantity = row.Quantity || 1;
      for (let i = 0; i < quantity; i++) {
        const qrContainer = document.createElement("div");
        qrContainer.className = "flex flex-col items-center";
        qrContainer.style.display = "flex";
        qrContainer.style.flexDirection = "column";
        qrContainer.style.alignItems = "center";

        // Create img element instead of canvas
        const qrImg = document.createElement("img");
        // Generate QR code as Data URL
        const qrUrl = await QRCode.toDataURL(row["QR code"] || "", {
          width: Math.round(widthIn),
          height: Math.round(heightIn),
        });
        qrImg.src = qrUrl;
        qrImg.alt = "QR Code";
        qrImg.style.width = `${widthIn}in`;
        qrImg.style.height = `${heightIn}in`;
        qrImg.style.objectFit = "contain";

        const textElement = document.createElement("p");
        textElement.className = " text-center";
        textElement.textContent = row["Custom Text"] || "";
        lastCustomText = row["Custom Text"] || "";

        qrContainer.appendChild(qrImg);
        qrContainer.appendChild(textElement);
        printContainer.appendChild(qrContainer);
      }
    }

    // Create a new window for printing
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
        <html>
            <head>
                <link rel="stylesheet" href="output.css">
                <style>
                    @media print {
                        @page {
                            margin: 0;
                            width: 3.93701in;
                            height: 1in;
                         }
                        body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                        img { max-width: 100%; height: auto; }
                    }
                </style>
            </head>
            <body>
                ${printContainer.outerHTML}
            </body>
        </html>
    `);

    printWindow.document.close();

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

    // Get current preview container's content
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
                        width: 3.93701in;
                        height: 1in;
                        }
                        body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                        img {  }
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
