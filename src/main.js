import { handleBulkPrint, updateBulkPreview } from "./bulk-print.js";
import {
  createQR,
  printSingle,
  updatePageSize,
  updatePreview,
  validateQRInput,
} from "./qr-generation.js";
import { renderTable, printQRModalTable } from "./qr-modal.js";
export { BASE_URL, PAGE_SIZES } from "./constants.js";

export const previewContainer = document.getElementById("qr-codes");
export const fileInput = document.getElementById("qr-code-file");
export const bulkGenerateButton = document.getElementById(
  "bulk-generate-button"
);
export const qr_code = document.getElementById("qr-code");
export const custom_text = document.getElementById("custom-text");
export const generateButton = document.getElementById("generate-qr");
export const validationMessage = document.getElementById(
  "qr-validation-message"
);
export const qrPreview = document.getElementById("qr-preview");
export const A4PrintButton = document.getElementById("open-print-button");

// QR Details Modal Logic
export const qrDetailModal = document.getElementById("qr-detail-modal");
export const tableHeadRow = document.getElementById("table-head-row");
export const tableBody = document.getElementById("table-body");
export const columnSelect = document.getElementById("column-select");
export const applyColumnsButton = document.getElementById("apply-columns");
export const downloadTableButton = document.getElementById("download-table");
export const closeQrDetailModalButton = document.getElementById(
  "close-qr-detail-modal"
);
export const printQrDetailButton = document.getElementById("print-qr-detail");

export let allCsvColumns = [];
export let SelectedExtraColumns = [];

export let bulkGeneratedQRs = null;

export function updateBulkGeneratedQRs(data) {
  bulkGeneratedQRs = data;
}

export function updateSelectedExtraColumns(columns) {
  SelectedExtraColumns = columns;
}

export function updateAllCsvColumns(columns) {
  allCsvColumns = columns;
}

// Print Controls
export const widthInput = document.getElementById("qr-width");
export const heightInput = document.getElementById("qr-height");
export const perRowInput = document.getElementById("per-row");
export const quantityInput = document.getElementById("quantity");
export const printButton = document.getElementById("print-button");
export const pageSizeSelect = document.getElementById("page-size");
export const testPrinterButton = document.getElementById("test-printer-button");

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

bulkGenerateButton.addEventListener("click", handleBulkPrint);
printButton.addEventListener("click", printSingle);
printQrDetailButton.addEventListener("click", printQRModalTable);

//   Add event listeners for controls to update preview
widthInput.addEventListener("input", updatePreview);
heightInput.addEventListener("input", updatePreview);
perRowInput.addEventListener("input", updatePreview);
quantityInput.addEventListener("input", updatePreview);
pageSizeSelect.addEventListener("change", updatePageSize);

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
fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  bulkGeneratedQRs = null;
  previewContainer.innerHTML = "";

  A4PrintButton.disabled = true;
});

document.getElementById("reset-button").addEventListener("click", () => {
  bulkGeneratedQRs = null;
  previewContainer.innerHTML = "";

  fileInput.value = "";
  tableBody.innerHTML = "";
  tableHeadRow.innerHTML = "";
  qr_code.value = "";
  custom_text.value = "";

  alert("All data has been reset.");
});

applyColumnsButton.addEventListener("click", () => {
  SelectedExtraColumns = Array.from(columnSelect.selectedOptions).map(
    (opt) => opt.value
  );
  renderTable(bulkGeneratedQRs);
});

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
