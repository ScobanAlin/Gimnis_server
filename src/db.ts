// src/db.ts
import "dotenv/config";
import { Pool } from "pg";

const ssl =
  process.env.PGSSLMODE === "require"
    ? { rejectUnauthorized: false }
    : undefined;

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl,
});

export const createTables = async () => {
  const query = `
  -- Judges
  CREATE TABLE IF NOT EXISTS judges (
    id SERIAL PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT CHECK(role IN ('principal', 'execution', 'artistry', 'difficulty')) NOT NULL
  );

  -- Competitors
  CREATE TABLE IF NOT EXISTS competitors (
    id SERIAL PRIMARY KEY,
    category TEXT NOT NULL,
    club TEXT NOT NULL
  );

  -- Competitor Members
  CREATE TABLE IF NOT EXISTS competitor_members (
    id SERIAL PRIMARY KEY,
    competitor_id INT REFERENCES competitors(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    age INT NOT NULL,
    sex CHAR(1) CHECK (sex IN ('M','F'))
  );

  -- Active competitor (vote in progress)
  CREATE TABLE IF NOT EXISTS current_vote (
    id SERIAL PRIMARY KEY,
    competitor_id INT NOT NULL UNIQUE REFERENCES competitors(id) ON DELETE CASCADE,
    started_at TIMESTAMP DEFAULT NOW()
  );

  -- Scores
  CREATE TABLE IF NOT EXISTS scores (
    id SERIAL PRIMARY KEY,
    judge_id INT NOT NULL REFERENCES judges(id) ON DELETE CASCADE,
    competitor_id INT NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
    value NUMERIC(4,1) NOT NULL,
    score_type TEXT NOT NULL CHECK (score_type IN (
      'execution',
      'artistry',
      'difficulty',
      'difficulty_penalization',
      'line_penalization',
      'principal_penalization'
    )),
    UNIQUE(judge_id, competitor_id, score_type)
  );

  -- Validated competitors (final result)
  CREATE TABLE IF NOT EXISTS validated_competitors (
    id SERIAL PRIMARY KEY,
    competitor_id INT NOT NULL UNIQUE REFERENCES competitors(id) ON DELETE CASCADE,
    validated_at TIMESTAMP DEFAULT NOW(),
    total_score NUMERIC(6,2) NOT NULL
  );

  -- Shown competitor (on screen)
  CREATE TABLE IF NOT EXISTS show_competitor (
    id SERIAL PRIMARY KEY,
    competitor_id INT UNIQUE REFERENCES competitors(id) ON DELETE CASCADE,
    started_at TIMESTAMP DEFAULT NOW()
  );
  `;

  await pool.query(query);
};

export default pool;
