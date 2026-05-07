// Fetch from Lose It!, sync sheets, and send digest (fully automated).
function triggerSyncSend() {
  syncData();
  sendDigest(readAllSheets());
}


// Fetch from Lose It! and sync sheets (no email).
function syncData() {
  writeAllSheets(fetchAndParseCsvs());
}


// Send digest from sheet data.
// To target a specific date, replace `d = {}` with `d = { year: 2026, month: 5, day: 24 }`.
// With no argument, (e.g. from a trigger) defaults to "today".
function runDigest(d = {}) {
  const date = (d.year && d.month && d.day)
    ? new Date(d.year, d.month - 1, d.day)
    : new Date()
  ;

  sendDigest(readAllSheets(), date);
}