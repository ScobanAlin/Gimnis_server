// src/services/googleSheets.ts
// Mirrors validated competitor scores into the live running-order Google Sheet.
// Row layout (1 header row + 1 row per competitor, in stage running order == competitors.id):
// A Categoria | B Nume | C Club | D Artistic | E Executie | F Dificultate | G Penalizare
// H Nota | I Confirm | J Rank (formula) | K . | L Urmatorul Nume | M Urmatorul Club | N Urmatoarea Categorie (formulas)
import { google } from "googleapis";
import db from "../db";
import { applyTolerance } from "../utils/scoring";

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = process.env.GOOGLE_SHEET_TAB_NAME;

function isConfigured() {
  return Boolean(
    SPREADSHEET_ID &&
      SHEET_NAME &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY
  );
}

let sheetsClient: ReturnType<typeof google.sheets> | null = null;

function getSheetsClient() {
  if (sheetsClient) return sheetsClient;

  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  sheetsClient = google.sheets({ version: "v4", auth });
  return sheetsClient;
}

async function fetchCompetitorScoreBreakdown(competitorId: number) {
  const membersRes = await db.query(
    `SELECT first_name, last_name FROM competitor_members WHERE competitor_id = $1 ORDER BY id`,
    [competitorId]
  );
  const scoresRes = await db.query(
    `SELECT score_type, value FROM scores WHERE competitor_id = $1 ORDER BY judge_id`,
    [competitorId]
  );

  const execution: number[] = [];
  const artistry: number[] = [];
  const difficulty: number[] = [];
  let penalties = 0;

  for (const row of scoresRes.rows) {
    const val = Number(row.value);
    if (row.score_type === "execution") execution.push(val);
    else if (row.score_type === "artistry") artistry.push(val);
    else if (row.score_type === "difficulty") difficulty.push(val);
    else if (
      ["difficulty_penalization", "line_penalization", "principal_penalization"].includes(
        row.score_type
      )
    ) {
      penalties += val;
    }
  }

  const name = membersRes.rows
    .map((m) => `${m.last_name} ${m.first_name}`)
    .join(" / ");

  return {
    name,
    artistry: applyTolerance(artistry),
    execution: applyTolerance(execution),
    difficulty: difficulty.length > 0 ? difficulty[0] : 0,
    penalties,
  };
}

export async function updateSheetOnValidate(competitorId: number, totalScore: number) {
  if (!isConfigured()) {
    console.warn("Google Sheets sync skipped: missing GOOGLE_* env vars");
    return;
  }

  try {
    const { artistry, execution, difficulty, penalties } =
      await fetchCompetitorScoreBreakdown(competitorId);

    const row = competitorId + 1; // row 1 = header
    const sheets = getSheetsClient();

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!D${row}:I${row}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          round1(artistry),
          round1(execution),
          round1(difficulty),
          round1(penalties),
          round3(totalScore),
          "DA",
        ]],
      },
    });
  } catch (err) {
    console.error("Google Sheets sync (validate) failed:", err);
  }
}

export async function clearSheetOnUnvalidate(competitorId: number) {
  if (!isConfigured()) {
    console.warn("Google Sheets sync skipped: missing GOOGLE_* env vars");
    return;
  }

  try {
    const row = competitorId + 1;
    const sheets = getSheetsClient();

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!D${row}:I${row}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [["", "", "", "", "", ""]],
      },
    });
  } catch (err) {
    console.error("Google Sheets sync (unvalidate) failed:", err);
  }
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
function round3(n: number) {
  return Math.round(n * 1000) / 1000;
}
