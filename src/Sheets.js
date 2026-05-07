// https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet-app

/**
 * Reads each configured sheet tab and returns data in the same format as
 * fetchAndParseCsvs() — use this when data was imported into the sheet manually.
 * @return {Object} Map of tab name → 2D array of string rows (including header).
 */
function readAllSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = Session.getScriptTimeZone();
  const result = {};
  CONFIG.CSV_FILES.forEach(filename => {
    const tabName = filename.replace(".csv", "");
    const sheet = ss.getSheetByName(tabName);
    if (!sheet) throw new Error(`Sheet tab not found: "${tabName}". Import the CSV data first.`);
    // getValues() returns Date objects for date-like cells written via setValues();
    // convert them back to the MM/dd/yyyy strings the rest of the code expects.
    result[tabName] = sheet.getDataRange().getValues().map(row =>
      row.map(cell => cell instanceof Date
        ? Utilities.formatDate(cell, tz, "MM/dd/yyyy")
        : String(cell))
    );
  });
  return result;
}

/**
 * Writes each parsed CSV dataset into its own sheet tab (full replace).
 * @param {Object} parsedData Map of tab name → 2D array of rows.
 */
function writeAllSheets(parsedData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  Object.entries(parsedData).forEach(([tabName, rows]) => {
    const sheet = ss.getSheetByName(tabName) || ss.insertSheet(tabName);
    sheet.clearContents();
    const range = sheet.getRange(1, 1, rows.length, rows[0].length);
    range.setNumberFormat("@");
    range.setValues(rows);
  });
}
