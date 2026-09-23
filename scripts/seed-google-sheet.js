// scripts/seed-google-sheet.js
// One-time prefill of the live running-order Google Sheet with the full
// competitor list, in stage running order (== competitors.id ASC, since that's
// exactly how scripts/seed-cupa-iasului.js inserted them).
//
// Writes:
//  - header row (A1:N1)
//  - A:C (Categoria/Nume/Club) for every competitor
//  - J (Rank) as a self-updating COUNTIFS formula, scoped per category
//  - L:N (Urmatorul Nume/Club/Categoria) as formulas that just read the next row
// D:I (Artistic/Executie/Dificultate/Penalizare/Nota/Confirm) are left blank —
// those get filled in live by src/services/googleSheets.ts when a competitor
// is validated in the app.
//
// Requires env vars: DATABASE_URL, GOOGLE_SERVICE_ACCOUNT_EMAIL,
// GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID, GOOGLE_SHEET_TAB_NAME

require("dotenv/config");
const { Pool } = require("pg");
const { google } = require("googleapis");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = process.env.GOOGLE_SHEET_TAB_NAME;

const HEADER = [
  "Categoria", "Nume", "Club", "Artistic", "Executie", "Dificultate",
  "Penalizare", "Nota", "Confirm", "Rank", ".", "Urmatorul Nume",
  "Urmatorul Club", "Urmatoarea Categorie",
];

async function main() {
  if (!SPREADSHEET_ID || !SHEET_NAME || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    console.error("Missing one of: GOOGLE_SHEET_ID, GOOGLE_SHEET_TAB_NAME, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY");
    process.exit(1);
  }

  const { rows } = await pool.query(`
    SELECT c.id, c.category, c.club,
           string_agg(m.last_name || ' ' || m.first_name, ' / ' ORDER BY m.id) AS members
    FROM competitors c
    LEFT JOIN competitor_members m ON m.competitor_id = c.id
    GROUP BY c.id, c.category, c.club
    ORDER BY c.id;
  `);
  await pool.end();

  if (rows.length === 0) {
    console.error("No competitors found in the database — seed the DB first.");
    process.exit(1);
  }

  const lastRow = rows.length + 1; // +1 for header

  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  // A:C — Categoria / Nume / Club
  const dataRows = rows.map((r) => [r.category, r.members || "", r.club]);

  // Spreadsheet locale (e.g. ro_RO) determines the formula argument
  // separator: comma-decimal locales use ";" instead of ",".
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sep = /^(ro|de|fr|es|it|pt|nl|pl|ru)/i.test(meta.data.properties.locale || "") ? ";" : ",";

  // D:I — clear any stale scores left over from a previous use of this sheet
  const blankScores = rows.map(() => ["", "", "", "", "", ""]);

  // J:N — Rank formula, spacer, next-competitor lookahead formulas
  const rankAndNext = rows.map((r, i) => {
    const row = i + 2; // sheet row for this competitor
    const nextRow = row + 1;
    const rankFormula = `=IF(H${row}=""${sep}""${sep}1+COUNTIFS($A$2:$A$${lastRow}${sep}A${row}${sep}$H$2:$H$${lastRow}${sep}">"&H${row}))`;
    const nextNume = `=IF(B${nextRow}=""${sep}""${sep}B${nextRow})`;
    const nextClub = `=IF(C${nextRow}=""${sep}""${sep}C${nextRow})`;
    const nextCategoria = `=IF(A${nextRow}=""${sep}""${sep}A${nextRow})`;
    return [rankFormula, "", nextNume, nextClub, nextCategoria];
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A1:N1`,
    valueInputOption: "RAW",
    requestBody: { values: [HEADER] },
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:C${lastRow}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: dataRows },
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!D2:I${lastRow}`,
    valueInputOption: "RAW",
    requestBody: { values: blankScores },
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!J2:N${lastRow}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: rankAndNext },
  });

  console.log(`Prefilled ${rows.length} rows (rows 2-${lastRow}) in "${SHEET_NAME}".`);
}

main().catch((err) => {
  console.error("Prefill failed:", err);
  process.exit(1);
});
