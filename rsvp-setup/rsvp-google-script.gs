/**
 * RSVP receiver for the 16th Anniversary microsite.
 *
 * - Saves ONE ROW PER PERSON in the Google Sheet this script is attached to.
 * - The person who RSVPs gets a row; each extra guest gets their own row with the same
 *   "RSVP #" and the host's name in "Guest of". Guests share the host's "Invited by".
 * - Everyone who is coming gets a tick box in "Attended" for you to tick at the event.
 * - Columns are found by their HEADING NAME, so you can move or reorder columns freely.
 *   Missing headings are added automatically at the end of the header row.
 *
 * Setup steps: see RSVP-SETUP.md
 */
const SHEET_NAME = 'RSVP';
const HEADERS = ['Received', 'RSVP #', 'Name', 'Age', 'Mobile / Email', 'From', 'Invited by',
                 'Attending', 'Guest of', 'Attended', 'Note'];

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
      const cols = ensureHeaders_(sheet);

      const attending = data.attending === 'Yes' ? 'Yes' : 'No';
      const extra = attending === 'Yes' && Array.isArray(data.party) ? data.party.slice(0, 9) : [];
      const rsvpNo = nextNumber_(sheet, cols.idx['RSVP #']);
      const now = new Date();
      const host = clean_(data.name, 80);
      const invitedBy = clean_(data.invitedBy, 80);

      const rows = [rowFor_(cols, {
        'Received': now, 'RSVP #': rsvpNo, 'Name': host, 'Age': age_(data.age),
        'Mobile / Email': clean_(data.contact, 80), 'From': clean_(data.from, 80),
        'Invited by': invitedBy, 'Attending': attending, 'Guest of': '', 'Note': clean_(data.message, 400)
      })];
      extra.forEach(function (g) {
        rows.push(rowFor_(cols, {
          'Received': now, 'RSVP #': rsvpNo, 'Name': clean_(g.name, 80) || '(no name given)', 'Age': age_(g.age),
          'Mobile / Email': clean_(g.contact, 80), 'From': clean_(g.from, 80),
          'Invited by': invitedBy, 'Attending': 'Yes', 'Guest of': host, 'Note': ''
        }));
      });

      const startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, rows.length, cols.count).setValues(rows);

      // A tick box for everyone who is coming. You tick it by hand when they arrive.
      rows.forEach(function (r, i) {
        if (r[cols.idx['Attending']] === 'Yes') {
          sheet.getRange(startRow + i, cols.idx['Attended'] + 1).insertCheckboxes();
        }
      });
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

// Reads the header row, adds any heading that is missing, and returns where each column is.
function ensureHeaders_(sheet) {
  const lastCol = sheet.getLastColumn();
  let headers = (sheet.getLastRow() > 0 && lastCol > 0)
    ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h).trim(); })
    : [];

  if (headers.length === 0 || headers.every(function (h) { return h === ''; })) {
    headers = HEADERS.slice();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  } else {
    HEADERS.forEach(function (h) {
      if (headers.indexOf(h) === -1) {
        headers.push(h);
        sheet.getRange(1, headers.length).setValue(h).setFontWeight('bold');
      }
    });
  }
  const idx = {};
  headers.forEach(function (h, i) { if (HEADERS.indexOf(h) !== -1 && !(h in idx)) idx[h] = i; });
  return { idx: idx, count: headers.length };
}

// One sheet row, with each value placed under its own heading.
function rowFor_(cols, values) {
  const row = new Array(cols.count).fill('');
  Object.keys(values).forEach(function (k) { row[cols.idx[k]] = values[k]; });
  return row;
}

// Next group number = highest "RSVP #" so far + 1
function nextNumber_(sheet, colIndex) {
  const last = sheet.getLastRow();
  if (last < 2) return 1;
  const nums = sheet.getRange(2, colIndex + 1, last - 1, 1).getValues()
    .map(function (r) { return Number(r[0]); })
    .filter(function (n) { return !isNaN(n) && n > 0; });
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