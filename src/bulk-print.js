import { BASE_URL, PAGE_SIZES } from "./constants.js";
import {
  bulkGeneratedQRs,
  fileInput,
  heightInput,
  pageSizeSelect,
  perRowInput,
  printButton,
  quantityInput,
  updateBulkGeneratedQRs,
  widthInput,
} from "./main.js";
import { showQRDetailModal } from "./qr-modal.js";

export async function handleBulkPrint() {
  try {
    if (bulkGeneratedQRs) {
      createPrintView(bulkGeneratedQRs);
      return;
    }
    const file = fileInput.files[0];
    if (!file) return alert("Please select a file first");

    const withCustomText = document.getElementById("with-custom-text").checked;
    const data = await readFile(file);

    if (!validateColumns(data))
      return alert("File must contain 'qr_code' & 'quantity'");

    printButton.textContent = "Generating...";
    printButton.disabled = true;

    const processedData = await Promise.all(
      data.map(async (row) => {
        const res = await fetch(
          `${BASE_URL}/qr-m2m/create-qr-without-db-save/`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code: row.qr_code,
              qr_without_text: !withCustomText,
              text_content: row.custom_text || "",
            }),
          }
        );
        if (!res) throw new Error(`Failed QR for ${row.qr_code}`);
        const blob = await res.blob();
        return {
          ...row,
          imageUrl: URL.createObjectURL(blob),
          hasCustomText: withCustomText,
        };
      })
    );

    // bulkGeneratedQRs = processedData;
    updateBulkGeneratedQRs(processedData);
    showQRDetailModal(processedData);
    document.getElementById("open-print-button").disabled = false;
    printButton.textContent = "Print Bulk QR Codes";
    printButton.disabled = false;
    quantityInput.disabled = true;

    updateBulkPreview(bulkGeneratedQRs);
  } catch (error) {
    console.error(error);
    alert("Error processing bulk print");
    printButton.textContent = "Generate Bulk QR";
    printButton.disabled = false;
    quantityInput.disabled = false;
  }
}

function validateColumns(data) {
  if (!data?.length) return false;
  const firstRow = data[0];
  return ["qr_code", "quantity"].every((col) => col in firstRow);
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const workbook = XLSX.read(e.target.result, { type: "binary" });
      const rows = XLSX.utils.sheet_to_json(
        workbook.Sheets[workbook.SheetNames[0]]
      );
      resolve(rows);
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
}

export async function createPrintView(data) {
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

export function updateBulkPreview() {
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
