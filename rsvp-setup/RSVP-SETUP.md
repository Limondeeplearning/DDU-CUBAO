# Connect the RSVP form to a Google Sheet (about 5 minutes)

1. Go to sheets.google.com and create a new, blank spreadsheet. Name it "16th Anniversary RSVP".
2. In the sheet, open **Extensions > Apps Script**.
3. Delete the sample code, then paste in everything from `rsvp-google-script.gs`. Click **Save**.
4. Click **Deploy > New deployment**. Click the gear icon and choose **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone** (guests are not signed in to Google; this only lets them submit, not read)
5. Click **Deploy** and approve the permissions (Google will warn that the app is unverified; click
   Advanced > Go to project (unsafe) > Allow). Copy the **Web app URL** that ends in `/exec`.
   Open it in a browser tab: you should see {"ok":true,"service":"rsvp"}.
6. Open `js/config.js` and paste the URL between the quotes:
   `window.RSVP_ENDPOINT = "https://script.google.com/macros/s/.../exec";`
7. Upload the site again. Submit a test RSVP with one extra guest: three rows should appear in a tab
   called "RSVP" (you and the guest). Delete the test rows afterwards.

## What the sheet looks like (one row per person)

| Column | Meaning |
|---|---|
| Received | When the RSVP came in |
| RSVP # | Same number for everyone who RSVPed together (a family shares one number) |
| Name | The person's name |
| Age | Optional: a whole number, or empty |
| Mobile / Email | Optional |
| From | Optional: city, town or church |
| Invited by | Optional: who invited them. Guests added to an RSVP share the same "Invited by" |
| Attending | Yes / No |
| Guest of | Blank for the person who RSVPed; for added guests, the name of whoever RSVPed for them |
| Attended | A tick box, only for people who said Yes. **You tick it by hand at the event** |
| Note | The optional message (on the main person's row only) |

The script finds each column by its **heading name**, so you can drag columns into any order and nothing breaks.
Please do not rename the headings.

## Using the "Attended" tick box
- Tick the box next to a person's name when they arrive.
- Everyone who said Yes gets a tick box automatically. People who said No do not.
- Rows added before this update have no tick box. To add them: select the empty "Attended" cells, then
  **Insert > Tick box**.

## Handy formulas
These letters match a brand-new sheet: A Received, B RSVP #, C Name, D Age, E Mobile/Email, F From, G Invited by,
H Attending, I Guest of, J Attended, K Note. If you move columns around, change the letters to match.
- Total people coming: `=COUNTIF(H:H,"Yes")`
- People who attended: `=COUNTIF(J:J,TRUE)`
- Coming but not ticked yet: `=COUNTIFS(H:H,"Yes",J:J,FALSE)`
- People invited by one person: `=COUNTIFS(H:H,"Yes",G:G,"Pastor Lito")`
- People coming from one place: `=COUNTIFS(H:H,"Yes",F:F,"Quezon City")`
- Children under 13 coming: `=COUNTIFS(H:H,"Yes",D:D,"<13")` (people who left age empty are not counted)
- Adults 18 and over: `=COUNTIFS(H:H,"Yes",D:D,">=18")`
- Filter by "From" or "Invited by", or sort by "RSVP #", to build a check-in list.

## Already set up with an earlier version?
Just deploy the new script as a new version (below). The first new RSVP adds the two new headings
("Invited by" and "Attended") at the right-hand end of your header row, and everything lands under the right
heading even if you moved or deleted columns. Drag the new columns wherever you like.
The cleanest option, if the sheet only holds test rows: delete the "RSVP" tab and let the script create it again.

To deploy a new version of the script (keeps the same link, so `config.js` does not change):
**Deploy > Manage deployments > pencil icon > Version: New version > Deploy.**
Always click Save in Apps Script first.

## Notes
- Until step 6 is done the form runs in preview mode and sends nothing.
- If you edit the script later, use **Deploy > Manage deployments > Edit > New version** so the URL stays the same.
- RSVP answers are personal data (names, ages, contact details, hometowns), and children's ages count too. The form says
  the details are used only to plan this event, so keep the sheet private and share it only with the people who need it.