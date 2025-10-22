import {
  allCsvColumns,
  bulkGeneratedQRs,
  columnSelect,
  printQrDetailButton,
  qrDetailModal,
  SelectedExtraColumns,
  tableBody,
  tableHeadRow,
  updateAllCsvColumns,
  updateSelectedExtraColumns,
} from "./main.js";

export function showQRDetailModal(data) {
  qrDetailModal.classList.remove("hidden");
  const csvColumns = Object.keys(data[0] ?? {}).filter(
    (key) =>
      ![
        "qr_code",
        "quantity",
        "custom_text",
        "imageUrl",
        "hasCustomText",
      ].includes(key)
  );

  updateAllCsvColumns(csvColumns);

  columnSelect.innerHTML = "";
  allCsvColumns.forEach((col) => {
    const option = document.createElement("option");
    option.value = col;
    option.textContent = col;
    columnSelect.appendChild(option);
  });

  // SelectedExtraColumns = [];
  updateSelectedExtraColumns([]);
  renderTable(data);
}

export function renderTable(data) {
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
  const anyChecked = Array.from(
    document.querySelectorAll(".row-checkbox")
  ).some((cb) => cb.checked);
  printQrDetailButton.disabled = !anyChecked;
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

export function printQRModalTable() {
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
