/**
 * RSVP receiver for the 16th Anniversary microsite.
 * Saves ONE ROW PER PERSON in the Google Sheet this script is attached to.
 * The person who RSVPs gets a row, and each extra guest gets their own row
 * with the same "RSVP #" and their host's name in "Guest of". Age is optional.
 * Setup steps: see RSVP-SETUP.md
 */
const SHEET_NAME = 'RSVP';
const HEADERS = ['Received', 'RSVP #', 'Name', 'Age', 'Mobile / Email', 'From', 'Attending', 'Guest of', 'Note'];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // Honeypot: bots fill the hidden "website" field, people never see it.
    if (data.website) return json_({ ok: true });

    const lock = LockService.getScriptLock();
    lock.waitLock(15000); // two RSVPs at the same moment must not collide
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(HEADERS);
        sheet.setFrozenRows(1);
        sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
      }

      const attending = data.attending === 'Yes' ? 'Yes' : 'No';
      const extra = attending === 'Yes' && Array.isArray(data.party) ? data.party.slice(0, 9) : [];
      const rsvpNo = nextNumber_(sheet);
      const now = new Date();
      const host = clean_(data.name, 80);

      const rows = [[
        now, rsvpNo, host, age_(data.age), clean_(data.contact, 80), clean_(data.from, 80),
        attending, '', clean_(data.message, 400)
      ]];
      extra.forEach(function (g) {
        rows.push([
          now, rsvpNo, clean_(g.name, 80) || '(no name given)', age_(g.age), clean_(g.contact, 80), clean_(g.from, 80),
          'Yes', host, ''
        ]);
      });

      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, HEADERS.length).setValues(rows);
    } finally {
      lock.releaseLock();
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// Optional: open the web app URL in a browser to check that it is live.
function doGet() { return json_({ ok: true, service: 'rsvp' }); }

// Next group number = highest "RSVP #" so far + 1
function nextNumber_(sheet) {
  const last = sheet.getLastRow();
  if (last < 2) return 1;
  const nums = sheet.getRange(2, 2, last - 1, 1).getValues()
    .map(function (r) { return Number(r[0]); })
    .filter(function (n) { return !isNaN(n); });
  return (nums.length ? Math.max.apply(null, nums) : 0) + 1;
}

// Age is optional: keep a whole number from 0 to 120, otherwise leave the cell empty.
function age_(value) {
  const t = String(value == null ? '' : value).trim();
  if (!/^\d{1,3}$/.test(t)) return '';
  const n = Number(t);
  return n <= 120 ? n : '';
}

// Trim, cap the length, and neutralise spreadsheet formulas (=, +, -, @).
function clean_(value, max) {
  const v = String(value == null ? '' : value).slice(0, max);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}