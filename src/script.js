const BASE_URL = "http://shivam-mac.local:3465/api/v1.0";

const PAGE_SIZES = {
  LARGE: { width: 100, height: 50 }, // 100mm x 50mm
  MEDIUM: { width: 100, height: 25 }, // 100mm x 25mm
  SMALL: { width: 25, height: 25 }, // 25mm x 25mm
};

const fileInput = document.getElementById("qr-code-file");
const printButton = document.getElementById("bulk-print-button");
const qr_code = document.getElementById("qr-code");
const custom_text = document.getElementById("custom-text");
const generateButton = document.getElementById("generate-qr");
const validationMessage = document.getElementById("qr-validation-message");
const qrPreview = document.getElementById("qr-preview");

// QR Details Modal Logic
const qrDetailModal = document.getElementById("qr-detail-modal");
const tableHeadRow = document.getElementById("table-head-row");
const tableBody = document.getElementById("table-body");
const columnSelect = document.getElementById("column-select");
const applyColumnsButton = document.getElementById("apply-columns");
const downloadTableButton = document.getElementById("download-table");
const closeQrDetailModalButton = document.getElementById(
  "close-qr-detail-modal"
);
const printQrDetailButton = document.getElementById("print-qr-detail");

let allCsvColumns = [];
let SelectedExtraColumns = [];

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
              size: 100mm 50mm;
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
  const perRow = Math.max(1, parseInt(perRowInput?.value, 10) || defaultPerRow);

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

    const withCustomText = document.getElementById("with-custom-text").checked;
    const data = await readFile(file);

    if (data.length > 500) {
      return alert(
        `⚠️ The uploaded file contains ${data.length} rows.\nOnly up to 500 rows are allowed.`
      );
    }

    // validate required columns
    if (!validateColumns(data)) {
      alert("File must contain columns: 'qr_code', 'quantity'");
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
              code: row["qr_code"],
              qr_without_text: !withCustomText,
              text_content: row["custom_text"] || "",
            }),
          }
        );

        if (!res) {
          throw new Error(`Failed to generate QR for code: ${row["qr_code"]}`);
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

    showQRDetailModal(processedData);
    document.getElementById("open-print-button").disabled = false;

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
  const widthMm = parseFloat(widthInput.value) || (withCustomText ? 100 : 50);
  const heightMm = parseFloat(heightInput.value) || 50;

  const grid = document.createElement("div");
  grid.style.display = "grid";
  const perRow = withCustomText ? 1 : 2;
  perRowInput.value = perRow;
  grid.style.gridTemplateColumns = `repeat(${perRow}, ${widthMm}mm)`;
  grid.style.width = `${widthMm}mm`;
  grid.style.height = `${heightMm}mm`;
  widthInput.value = widthMm;
  heightInput.value = heightMm;

  bulkGeneratedQRs.forEach((row) => {
    const quantity = parseInt(row.quantity) || 1;

    for (let i = 0; i < quantity; i++) {
      const qrContainer = document.createElement("div");
      qrContainer.style.display = "flex";
      qrContainer.style.flexDirection = "column";
      qrContainer.style.alignItems = "center";

      const img = document.createElement("img");
      img.src = row.imageUrl;
      img.style.width = `${widthMm}mm`;
      img.style.height = `${heightMm}mm`;
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
  return ["qr_code", "quantity"].every((col) => col in firstRow);
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
    const quantity = parseInt(row.quantity) || 1;
    const widthMm =
      parseFloat(widthInput.value) || (row.hasCustomText ? 100 : 50);
    const heightMm = parseFloat(heightInput.value) || 50;
    const perRow = parseInt(perRowInput.value) || (row.hasCustomText ? 1 : 2);

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
      qrContainer.style.width = `${widthMm}mm`;
      qrContainer.style.height = `${heightMm}mm`;
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
                    }
                    .qr-container {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        margin: 0;
                        padding: 0;
                        width: ${parseFloat(widthInput.value) || 50}mm;
                        height: ${parseFloat(heightInput.value) || 50}mm;
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

function showQRDetailModal(data) {
  qrDetailModal.classList.remove("hidden");

  // Determine all columns
  if (data.length > 0) {
    allCsvColumns = Object.keys(data[0]).filter(
      (key) =>
        ![
          "qr_code",
          "quantity",
          "custom_text",
          "imageUrl",
          "hasCustomText",
        ].includes(key)
    );

    columnSelect.innerHTML = "";
    allCsvColumns.forEach((col) => {
      const option = document.createElement("option");
      option.value = col;
      option.textContent = col;
      columnSelect.appendChild(option);
    });
  }

  SelectedExtraColumns = [];
  renderTable(data);
}

function renderTable(data) {
  // Fixed + selected dynamic columns
  const columns = [
    "select",
    "qr_code",
    "quantity",
    "custom_text",
    ...SelectedExtraColumns,
  ];

  // Create table head
  tableHeadRow.innerHTML = "";
  columns.forEach((col) => {
    const th = document.createElement("th");
    if (col === "select") {
      const selectAll = document.createElement("input");
      selectAll.type = "checkbox";
      selectAll.id = "select-all-checkbox";
      selectAll.addEventListener("change", () => {
        const allRowCheckboxes = document.querySelectorAll(".row-checkbox");
        allRowCheckboxes.forEach((cb) => {
          cb.checked = selectAll.checked;
        });
        updatePrintButtonState();
      });
      th.appendChild(selectAll);
    } else {
      th.textContent = col.replace(/_/g, " ").toUpperCase();
      th.className = "border px-2 py-1 cursor-pointer hover:bg-gray-200";
      th.dataset.column = col;
      th.addEventListener("click", () => sortTableByColumn(col, data));
    }
    tableHeadRow.appendChild(th);
  });

  // Create table body
  tableBody.innerHTML = "";
  data.forEach((row, index) => {
    const tr = document.createElement("tr");
    columns.forEach((col) => {
      const td = document.createElement("td");
      td.className = "border px-2 py-1 w-max";

      if (col === "select") {
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.classList.add("row-checkbox");
        checkbox.dataset.index = index;
        td.style.textAlign = "center";
        checkbox.addEventListener("change", updatePrintButtonState);
        td.appendChild(checkbox);
      } else if (col === "qr_code") {
        td.classList.add("qr-cell");
        const img = document.createElement("img");
        img.src = row.imageUrl || "";
        img.alt = row.qr_code || "QR Code";
        img.style.width = "200px";
        img.style.height = "auto";
        img.style.objectFit = "cover";
        img.style.border = "1px solid #e5e7eb";

        const hasCustomText =
          row.hasCustomText ||
          (document.getElementById("with-custom-text")?.checked ?? false);

        if (hasCustomText) {
          img.style.objectPosition = "left center";
          img.style.width = "400px";
          img.style.clipPath = "inset(0 50% 0 0)";
        }

        img.dataset.hasCustomText = hasCustomText ? "true" : "false";

        td.appendChild(img);
      } else {
        td.textContent = row[col] ?? "";
      }
      tr.appendChild(td);
    });
    tableBody.appendChild(tr);
  });

  updatePrintButtonState();
}

function updatePrintButtonState() {
  const checkboxes = document.querySelectorAll(".row-checkbox");
  const anyChecked = Array.from(checkboxes).some((cb) => cb.checked);
  const printBtn = document.getElementById("print-qr-detail");
  if (printBtn) {
    printBtn.disabled = !anyChecked;
    printBtn.classList.toggle("opacity-50", !anyChecked);
    printBtn.classList.toggle("cursor-not-allowed", !anyChecked);
  }
}

let sortDirection = {};
function sortTableByColumn(column, data) {
  sortDirection[column] = !sortDirection[column];
  data.sort((a, b) => {
    const valA = a[column] ?? "";
    const valB = b[column] ?? "";
    return sortDirection[column]
      ? String(valA).localeCompare(String(valB))
      : String(valB).localeCompare(String(valA));
  });

  renderTable(data);
}

applyColumnsButton.addEventListener("click", () => {
  SelectedExtraColumns = Array.from(columnSelect.selectedOptions).map(
    (opt) => opt.value
  );
  renderTable(bulkGeneratedQRs);
});

// Download CSV
downloadTableButton.addEventListener("click", () => {
  if (!bulkGeneratedQRs || bulkGeneratedQRs.length === 0)
    return alert("No data to download");

  const columns = [
    "qr_code",
    "quantity",
    "custom_text",
    ...SelectedExtraColumns,
  ];
  const csvRows = [columns.join(",")];
  bulkGeneratedQRs.forEach((row) => {
    const values = columns.map((col) => `"${row[col] ?? ""}"`);
    csvRows.push(values.join(","));
  });

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "qr_details.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

function printQRModalTable() {
  const modal = document.getElementById("qr-detail-modal");
  const table = modal.querySelector("table");
  const selectedRows = [];

  // Collect only checked rows
  const checkboxes = table.querySelectorAll(".row-checkbox");
  checkboxes.forEach((cb) => {
    if (cb.checked) {
      const rowIndex = cb.dataset.index;
      selectedRows.push(bulkGeneratedQRs[rowIndex]);
    }
  });

  if (selectedRows.length === 0) {
    alert("Please select at least one row to print");
    return;
  }

  // Clone the table and remove checkbox column
  const tableClone = table.cloneNode(true);

  // Remove checkbox column from header
  const selectHeader = tableClone.querySelector("th:first-child");
  if (selectHeader && selectHeader.querySelector("input[type='checkbox']")) {
    selectHeader.remove();
  }

  // Remove checkbox cells from each row that was NOT selected
  const bodyRows = Array.from(tableClone.querySelectorAll("tbody tr"));
  bodyRows.forEach((row, index) => {
    // Remove the checkbox cell
    const checkboxCell = row.querySelector(
      "td:first-child input[type='checkbox']"
    );
    if (checkboxCell) {
      row.cells[0].remove();
    }

    // Remove any row that wasn’t selected
    const originalCheckbox = table.querySelector(
      `.row-checkbox[data-index="${index}"]`
    );
    if (!originalCheckbox?.checked) {
      row.remove();
    }
  });

  // Adjust QR image styles
  const qrCells = tableClone.querySelectorAll("td.qr-cell img");
  qrCells.forEach((img) => {
    const hasCustomText = img.dataset.hasCustomText === "true";
    if (hasCustomText) {
      img.style.objectFit = "cover";
      img.style.width = "200px";
      img.style.height = "auto";
      img.style.objectPosition = "left center"; // show left half
    } else {
      img.style.width = "200px";
      img.style.height = "auto";
      img.style.objectFit = "contain";
    }
  });

  // Open a new print window
  const printWindow = window.open("", "_blank");
  printWindow.document.write(`
    <html>
      <head>
        <title>Print QR Table</title>
        <style>
          @media print {
            input[type="checkbox"] { display: none !important; }
          }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #000; padding: 4px; text-align: center; }
          img { display: block; margin: 0 auto; width: 100px; height: auto; }
        </style>
      </head>
      <body>
        ${tableClone.outerHTML}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}
