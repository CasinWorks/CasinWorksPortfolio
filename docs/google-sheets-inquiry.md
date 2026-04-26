## Goal

Keep the portfolio's custom Inquiry form UI, but submit entries to a **Google Sheet** (free) via a **Google Apps Script Web App** endpoint.

This avoids the styling limits of embedded Google Forms and works without requiring the visitor to have an email client configured.

## 1) Create the spreadsheet

- Create a new Google Sheet (e.g. `Website Inquiries`).
- Copy the spreadsheet ID from the URL:
  - `https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit#gid=0`

## 2) Create the Apps Script

- In the Google Sheet: **Extensions → Apps Script**
- Replace the script contents with the code below.
- Set `SPREADSHEET_ID` to your sheet ID.

```js
const SPREADSHEET_ID = "PASTE_YOUR_SPREADSHEET_ID_HERE";
const SHEET_NAME = "Inquiries";

function doPost(e) {
  try {
    const raw = e && e.postData && e.postData.contents ? e.postData.contents : "";
    const body = raw ? JSON.parse(raw) : {};

    const name = String(body.name || "").trim();
    const organization = String(body.organization || "").trim();
    const email = String(body.email || "").trim();
    const brief = String(body.brief || "").trim();
    const page = String(body.page || "").trim();
    const submittedAt = String(body.submittedAt || new Date().toISOString()).trim();

    if (!email) {
      return json_({ ok: false, error: "Missing email" }, 400);
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

    // Header row (created once)
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["submittedAt", "name", "organization", "email", "brief", "page"]);
    }

    sheet.appendRow([submittedAt, name, organization, email, brief, page]);

    return json_({ ok: true }, 200);
  } catch (err) {
    return json_({ ok: false, error: String(err) }, 500);
  }
}

function doGet() {
  // simple health check for your browser
  return json_({ ok: true, message: "Inquiry endpoint is running" }, 200);
}

function json_(obj, status) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## 3) Deploy as a Web App

- Click **Deploy → New deployment**
- Select **Web app**
- **Execute as**: Me
- **Who has access**: Anyone
- Click **Deploy**
- Copy the **Web app URL**:
  - `https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec`

## 4) Configure your website

- Create `.env.local` in the project root (or add it to your deployment environment):

```bash
VITE_INQUIRY_ENDPOINT="PASTE_WEB_APP_URL_HERE"
```

- Restart the dev server.

## 5) Test

- Fill out your Inquiry form on the site.
- Confirm a new row appears in the `Inquiries` sheet.

## Notes

- If you later change the script code, you may need to **Deploy → Manage deployments → Edit** and create a new version.
- For spam reduction (optional): add a hidden "honeypot" field in the site UI or add basic rate limiting at the edge (Cloudflare) once deployed.

