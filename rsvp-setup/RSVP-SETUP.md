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
| Attending | Yes / No |
| Guest of | Blank for the person who RSVPed; for added guests, the name of whoever RSVPed for them |
| Party size | How many people are in that RSVP (0 when someone declines) |
| Note | The optional message (on the main person's row only) |

Handy formulas (columns: A Received, B RSVP #, C Name, D Age, E Mobile/Email, F From, G Attending, H Guest of, I Party size, J Note)
- Total people coming: `=COUNTIF(G:G,"Yes")`
- People coming from one place: `=COUNTIFS(G:G,"Yes",F:F,"Quezon City")`
- Children under 13 coming: `=COUNTIFS(G:G,"Yes",D:D,"<13")` (people who left age empty are not counted)
- Adults 18 and over: `=COUNTIFS(G:G,"Yes",D:D,">=18")`
- Filter by "From" or sort by "RSVP #" to build a check-in list.

## Notes
- If you tried an earlier version of the script, delete the "RSVP" tab first so the new column headings are created.
- Until step 6 is done the form runs in preview mode and sends nothing.
- If you edit the script later, use **Deploy > Manage deployments > Edit > New version** so the URL stays the same.
- RSVP answers are personal data (names, ages, contact details, hometowns), and children's ages count too. The form says
  the details are used only to plan this event, so keep the sheet private and share it only with the people who need it.