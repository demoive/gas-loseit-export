// Fetch from Lose It!, sync sheets, and send digest (fully automated).
function triggerSyncSend() {
  syncData();
  sendDigest();
}


// Fetch from Lose It! and sync sheets (no email).
function syncData() {
  writeAllSheets(fetchAndParseCsvs());
}


// Manually send digest to the script owner
function testDigest() {
  const year  = 2026;
  const month = 5;
  const day   = 10;

  sendDigest(
    readAllSheets(),
    new Date(year, month - 1, day),
    Session.getEffectiveUser().getEmail()
  );
}