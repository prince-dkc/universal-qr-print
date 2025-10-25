// qr-generation.js
import { createPrintView, updateBulkPreview } from "./bulk-print.js";
import { BASE_URL, PAGE_SIZES } from "./constants.js";
import {
  A4PrintButton,
  blobToBase64,
  bulkGeneratedQRs,
  custom_text,
  heightInput,
  loadState,
  pageSizeSelect,
  perRowInput,
  printButton,
  qr_code,
  qrPreview,
  quantityInput,
  saveState,
  updateBulkGeneratedQRs,
  validationMessage,
  widthInput,
  withTextRadio,
} from "./main.js";

export let lastImageUrl = null;
let lastCode = "";
let lastCustomText = "";

document.addEventListener("DOMContentLoaded", () => {
  loadState();

  // If there was a previous single QR generated, restore its preview
  const savedQRs = JSON.parse(localStorage.getItem("bulkGeneratedQRs"));
  if (!savedQRs || savedQRs.length === 0) {
    const previewContainer = document.getElementById("qr-codes");
    if (previewContainer.innerHTML.trim() === "") {
      updatePreview();
    }
  }
});

export function validateQRInput() {
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

export async function createQR() {
  try {
    const value = qr_code.value.trim();

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
        code: qr_code.value.toUpperCase(),
        qr_without_text: !withTextRadio.checked,
        text_content: custom_text.value,
      }),
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    // Get the blob from response
    const qr_blob = await res.blob();

    lastImageUrl = await blobToBase64(qr_blob);
    lastCode = value;
    lastCustomText = custom_text.value || "";

    // printSingleButton.disabled = false;
    quantityInput.disabled = false;

    const defaultWidth = withTextRadio.checked ? "100" : "50";
    widthInput.value = defaultWidth;

    perRowInput.value = withTextRadio.checked ? 1 : 2;

    // Update height to match width for QR without text
    if (!withTextRadio.checked) {
      heightInput.value = "50";
    }

    // Update QR preview using the blob URL
    if (qrPreview) {
      qrPreview.src = lastImageUrl;
      qrPreview.style.width = `${widthInput.value}mm`;
      qrPreview.style.height = `${heightInput.value}mm`;
    }

    updatePreview();
    updateBulkGeneratedQRs(null);
    A4PrintButton.disabled = true;
    printButton.disabled = false;

    saveState();

    validationMessage.textContent = "";
  } catch (error) {
    console.error("Error fetching QR data:", error);
    custom_text.value = "";
    validationMessage.textContent = "Error generating QR code";
  }
}

export function updatePreview() {
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
  // grid.style.marginBottom = "10mm";
  // grid.style.marginLeft = "1mm";
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

export function updatePageSize() {
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

export function printSingle() {
  if (bulkGeneratedQRs) {
    createPrintView(bulkGeneratedQRs);
    return;
  }

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
                        @page { 
                          margin: 0;
                          margin-bottom: 0.1in;
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
  };
}
