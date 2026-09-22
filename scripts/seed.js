// scripts/seed.js
// Populates the database with realistic-ish random data across every table,
// following the same rules the app itself enforces:
//  - member counts per category (src/utils/validators.ts: getExpectedMemberCount)
//  - score range 0-10 (validateScore) and score_type set (scoreController.allowedScoreTypes)
//  - FIG tolerance averaging needs >=4 execution/artistry judges to kick in (rankingModel.applyTolerance)
//
// Usage:
//   node scripts/seed.js            (adds data on top of what's there)
//   node scripts/seed.js --reset    (TRUNCATEs all tables first, then seeds)
//
// Reads the same env vars as src/db.ts (DATABASE_URL, or PGHOST/PGPORT/...).

require("dotenv/config");
const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;
const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : new Pool({
      host: process.env.PGHOST,
      port: Number(process.env.PGPORT) || 5432,
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
    });

const RESET = process.argv.includes("--reset");

// ---------- helpers ----------
function randFloat(min, max) {
  return Math.random() * (max - min) + min;
}
function randInt(min, max) {
  return Math.floor(randFloat(min, max + 1));
}
function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}
function round1(n) {
  return Math.round(n * 10) / 10;
}
function round3(n) {
  return Math.round(n * 1000) / 1000;
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function slug(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]+/g, ".");
}

// same rule as src/utils/validators.ts getExpectedMemberCount
function memberCountFor(category) {
  if (category.includes("Individual")) return 1;
  if (category.includes("Pair")) return 2;
  if (category.includes("Trio")) return 3;
  if (category.includes("Group")) return 5;
  if (category.includes("Dance")) return randInt(6, 8);
  return 1;
}

// mirrors rankingModel.ts tolerance logic, used only to produce a sane total_score
function getAllowedTolerance(avg) {
  if (avg >= 8.0) return 0.3;
  if (avg >= 7.0) return 0.4;
  if (avg >= 6.0) return 0.5;
  return 0.6;
}
function applyTolerance(arr) {
  if (arr.length < 4) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const middleTwo = [sorted[1], sorted[2]];
  const avgMiddle = (middleTwo[0] + middleTwo[1]) / 2;
  const diff = Math.abs(middleTwo[0] - middleTwo[1]);
  const allowed = getAllowedTolerance(avgMiddle);
  if (diff > allowed) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }
  return avgMiddle;
}

// ---------- fixture data ----------
const FIRST_NAMES_F = [
  "Maria", "Ioana", "Andreea", "Elena", "Ana", "Sofia", "Alexia", "Bianca",
  "Clara", "Daria", "Emma", "Larisa", "Miruna", "Nicoleta", "Patricia",
  "Raluca", "Sara", "Teodora", "Victoria", "Iulia",
];
const FIRST_NAMES_M = [
  "Andrei", "Mihai", "Alexandru", "David", "Gabriel", "Cristian", "Marius",
  "Robert", "Stefan", "Vlad", "Radu", "Tudor", "Matei", "Rares", "Daniel",
  "Eduard", "Cosmin", "Florin", "Ionut", "Sebastian",
];
const LAST_NAMES = [
  "Popescu", "Ionescu", "Popa", "Stan", "Dumitru", "Stoica", "Gheorghe",
  "Constantin", "Marin", "Toma", "Ene", "Radu", "Cristea", "Nistor",
  "Dinu", "Barbu", "Vasilescu", "Pavel", "Matei", "Petrescu",
];
const CLUBS = [
  "CS Gimnastica Cluj", "ACS Elan Bucuresti", "CSS Viitorul Timisoara",
  "ACS Ritmica Constanta", "CS Speranta Iasi", "ACS Aerobic Star Oradea",
  "CSS1 Brasov", "ACS Phoenix Sibiu", "CS Junior Team Craiova",
  "ACS Dinamic Ploiesti",
];

function randomName(sex) {
  const first = sex === "M" ? pick(FIRST_NAMES_M) : pick(FIRST_NAMES_F);
  const last = pick(LAST_NAMES);
  return { first_name: first, last_name: last };
}
function emailFor(first, last, n) {
  return `${slug(first)}.${slug(last)}${n}@example.com`;
}

// category plan: name, how many competitors, sex mix, age range
const CATEGORY_PLAN = [
  { name: "Individual Men - Youth", count: 4, sexes: ["M"], age: [12, 14] },
  { name: "Individual Women - Youth", count: 5, sexes: ["F"], age: [12, 14] },
  { name: "Mixed Pair - Youth", count: 3, sexes: ["M", "F"], age: [12, 14] },
  { name: "Trio - Youth", count: 3, sexes: ["F"], age: [12, 14] },
  { name: "Group - Youth", count: 3, sexes: ["F"], age: [12, 14] },
  { name: "Aerobic Dance - Youth", count: 2, sexes: ["M", "F"], age: [12, 14] },
  { name: "Individual Women - Seniors", count: 4, sexes: ["F"], age: [18, 24] },
  { name: "Individual Men - Juniors", count: 3, sexes: ["M"], age: [15, 17] },
];

async function main() {
  const client = await pool.connect();
  try {
    if (RESET) {
      console.log("Resetting tables...");
      await client.query(
        `TRUNCATE judges, competitors, competitor_members, current_vote,
                  scores, validated_competitors, show_competitor
         RESTART IDENTITY CASCADE;`
      );
    }

    await client.query("BEGIN");

    // ---------- judges ----------
    const judgeIds = { principal: [], execution: [], artistry: [], difficulty: [] };
    const judgePlan = [
      ["principal", 1],
      ["execution", 5],
      ["artistry", 5],
      ["difficulty", 2],
    ];
    for (const [role, count] of judgePlan) {
      for (let i = 0; i < count; i++) {
        const { first_name, last_name } = randomName(pick(["M", "F"]));
        const res = await client.query(
          `INSERT INTO judges (first_name, last_name, role) VALUES ($1, $2, $3) RETURNING id`,
          [first_name, last_name, role]
        );
        judgeIds[role].push(res.rows[0].id);
      }
    }
    console.log("Judges created:", judgeIds);

    // ---------- competitors + members + scores ----------
    const competitorIds = [];
    let emailCounter = 1;

    for (const cat of CATEGORY_PLAN) {
      const requiredMembers = memberCountFor(cat.name);

      for (let i = 0; i < cat.count; i++) {
        const club = pick(CLUBS);
        const compRes = await client.query(
          `INSERT INTO competitors (category, club) VALUES ($1, $2) RETURNING id`,
          [cat.name, club]
        );
        const competitorId = compRes.rows[0].id;
        competitorIds.push(competitorId);

        for (let m = 0; m < requiredMembers; m++) {
          const sex = pick(cat.sexes);
          const { first_name, last_name } = randomName(sex);
          const age = randInt(cat.age[0], cat.age[1]);
          const email = emailFor(first_name, last_name, emailCounter++);
          await client.query(
            `INSERT INTO competitor_members
             (competitor_id, first_name, last_name, email, age, sex)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [competitorId, first_name, last_name, email, age, sex]
          );
        }

        // execution scores (need >=4 for tolerance rule to apply)
        const execValues = [];
        for (const judgeId of judgeIds.execution) {
          const value = round1(randFloat(7.0, 9.6));
          execValues.push(value);
          await client.query(
            `INSERT INTO scores (judge_id, competitor_id, value, score_type)
             VALUES ($1, $2, $3, 'execution')`,
            [judgeId, competitorId, value]
          );
        }

        // artistry scores
        const artValues = [];
        for (const judgeId of judgeIds.artistry) {
          const value = round1(randFloat(7.0, 9.6));
          artValues.push(value);
          await client.query(
            `INSERT INTO scores (judge_id, competitor_id, value, score_type)
             VALUES ($1, $2, $3, 'artistry')`,
            [judgeId, competitorId, value]
          );
        }

        // difficulty scores (rankingModel only uses the first one, in judge_id order)
        const diffValues = [];
        for (const judgeId of judgeIds.difficulty) {
          const value = round1(randFloat(4.0, 7.5));
          diffValues.push(value);
          await client.query(
            `INSERT INTO scores (judge_id, competitor_id, value, score_type)
             VALUES ($1, $2, $3, 'difficulty')`,
            [judgeId, competitorId, value]
          );
        }

        // occasional penalties
        let penalties = 0;
        if (Math.random() < 0.25) {
          const value = round1(randFloat(0.1, 0.3));
          penalties += value;
          await client.query(
            `INSERT INTO scores (judge_id, competitor_id, value, score_type)
             VALUES ($1, $2, $3, 'principal_penalization')`,
            [judgeIds.principal[0], competitorId, value]
          );
        }
        if (Math.random() < 0.2) {
          const value = round1(randFloat(0.1, 0.5));
          penalties += value;
          await client.query(
            `INSERT INTO scores (judge_id, competitor_id, value, score_type)
             VALUES ($1, $2, $3, 'line_penalization')`,
            [judgeIds.execution[0], competitorId, value]
          );
        }
        if (Math.random() < 0.15) {
          const value = round1(randFloat(0.1, 0.3));
          penalties += value;
          await client.query(
            `INSERT INTO scores (judge_id, competitor_id, value, score_type)
             VALUES ($1, $2, $3, 'difficulty_penalization')`,
            [judgeIds.difficulty[0], competitorId, value]
          );
        }

        // ---------- validate ~70% of competitors ----------
        if (Math.random() < 0.7) {
          const executionAvg = applyTolerance(execValues);
          const artistryAvg = applyTolerance(artValues);
          const difficultyVal = diffValues[0] || 0;
          const totalScore = round3(
            executionAvg + artistryAvg + difficultyVal - penalties
          );
          await client.query(
            `INSERT INTO validated_competitors (competitor_id, total_score)
             VALUES ($1, $2)`,
            [competitorId, totalScore]
          );
        }
      }
    }

    // ---------- one active vote + one shown competitor ----------
    const unvalidated = await client.query(
      `SELECT id AS competitor_id FROM competitors
       WHERE id NOT IN (SELECT competitor_id FROM validated_competitors)`
    );
    const voteCandidates = unvalidated.rows.length
      ? unvalidated.rows.map((r) => r.competitor_id)
      : competitorIds;
    const currentVoteId = pick(voteCandidates.length ? voteCandidates : competitorIds);
    if (currentVoteId) {
      await client.query(`INSERT INTO current_vote (competitor_id) VALUES ($1)`, [
        currentVoteId,
      ]);
    }

    const validatedRows = await client.query(
      `SELECT competitor_id FROM validated_competitors`
    );
    if (validatedRows.rows.length) {
      const showId = pick(validatedRows.rows.map((r) => r.competitor_id));
      await client.query(
        `INSERT INTO show_competitor (competitor_id, started_at) VALUES ($1, NOW())`,
        [showId]
      );
    }

    await client.query("COMMIT");
    console.log(`Seeded ${competitorIds.length} competitors across ${CATEGORY_PLAN.length} categories.`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Seed failed, rolled back:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
