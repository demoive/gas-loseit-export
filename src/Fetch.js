// https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app

/**
 * Downloads the Lose It! export ZIP and parses each configured CSV.
 * @return {Object} Map of tab name → 2D array of rows (including header).
 */
function fetchAndParseCsvs() {
  const response = UrlFetchApp.fetch(CONFIG.EXPORT_URL, {
    method: "get",
    headers: { Cookie: CONFIG.EXPORT_SESSION_COOKIE },
    muteHttpExceptions: true,
  });

  const code = response.getResponseCode();
  if (code !== 200) {
    throw new Error(`Lose It! export request failed: HTTP ${code}\n${response.getContentText()}`);
  }

  const zipEntries = Utilities.unzip(response.getBlob());

  const byName = {};
  zipEntries.forEach(blob => { byName[blob.getName()] = blob; });

  const result = {};
  CONFIG.CSV_FILES.forEach(filename => {
    if (!byName[filename]) {
      throw new Error(`Expected file not found in ZIP: ${filename}`);
    }
    const tabName = filename.replace(".csv", "");
    result[tabName] = Utilities.parseCsv(byName[filename].getDataAsString());
  });

  checkCookieExpiry_();

  return result;
}

/**
 * Decodes the fn_auth JWT to read its exp claim and emails the script owner
 * if the cookie expires within EXPORT_SESSION_COOKIE_EXPIRY_WARNING_DAYS: 14,
 days.
 */
function checkCookieExpiry_() {
  const parts = CONFIG.EXPORT_SESSION_COOKIE.split(".");
  if (parts.length !== 3) return; // not a JWT, skip

  const pad = parts[1].length % 4;
  const padded = pad ? parts[1] + "=".repeat(4 - pad) : parts[1];
  const payload = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(padded)).getDataAsString());

  if (!payload.exp) return;

  const expiryDate = new Date(payload.exp * 1000);
  const daysUntilExpiry = Math.floor((expiryDate - new Date()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry > CONFIG.EXPORT_SESSION_COOKIE_EXPIRY_WARNING_DAYS) return;

  const formattedExpiry = Utilities.formatDate(expiryDate, Session.getScriptTimeZone(), "MMMM d, yyyy");
  const scriptId = ScriptApp.getScriptId();
  const settingsUrl = `https://script.google.com/u/0/home/projects/${scriptId}/settings`;

  const tmpl = HtmlService.createTemplateFromFile(CONFIG.EMAIL_TEMPLATE_COOKIE_EXPIRY);
  tmpl.data = { daysUntilExpiry, formattedExpiry, settingsUrl };

  MailApp.sendEmail({
    noReply: true,
    to: Session.getEffectiveUser().getEmail(),
    subject: `⚠️ Lose It! session cookie expires in ${daysUntilExpiry} days`,
    body: tmpl.evaluate().getContent(),
  });

}
