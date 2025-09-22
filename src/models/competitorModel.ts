import db from "../db";

// ✅ Insert competitor
export const insertCompetitor = async (
  category: string,
  club: string,
  members: {
    first_name: string;
    last_name: string;
    email: string;
    age: number;
    sex: "M" | "F";
  }[]
) => {
  const compRes = await db.query(
    `INSERT INTO competitors (category, club)
     VALUES ($1, $2)
     RETURNING *;`,
    [category, club]
  );
  const competitor = compRes.rows[0];

  for (const m of members) {
    await db.query(
      `INSERT INTO competitor_members
       (competitor_id, first_name, last_name, email, age, sex)
       VALUES ($1, $2, $3, $4, $5, $6);`,
      [competitor.id, m.first_name, m.last_name, m.email, m.age, m.sex]
    );
  }

  competitor.members = members;
  return competitor;
};

// ✅ Delete competitor
export const deleteCompetitorById = async (id: number) => {
  const res = await db.query(
    `DELETE FROM competitors WHERE id=$1 RETURNING *;`,
    [id]
  );
  return res.rows[0];
};

// ✅ Get all competitors
export const getAllCompetitors = async () => {
  const query = `
    SELECT c.id as competitor_id,
           c.category,
           c.club,
           m.id as member_id,
           m.first_name,
           m.last_name,
           m.age,
           m.sex
    FROM competitors c
    LEFT JOIN competitor_members m ON m.competitor_id = c.id
    ORDER BY c.id, m.id;
  `;
  const result = await db.query(query);

  const grouped: Record<number, any> = {};
  result.rows.forEach((row) => {
    if (!grouped[row.competitor_id]) {
      grouped[row.competitor_id] = {
        id: row.competitor_id,
        category: row.category,
        club: row.club,
        members: [],
      };
    }
    if (row.member_id) {
      grouped[row.competitor_id].members.push({
        id: row.member_id,
        first_name: row.first_name,
        last_name: row.last_name,
        age: row.age,
        sex: row.sex,
      });
    }
  });

  return Object.values(grouped);
};

// ✅ Fetch competitors with scores & validation status
export const fetchCompetitorsWithScores = async (category: string) => {
  const query = `
    SELECT 
      c.id AS competitor_id,
      c.category,
      c.club,
      m.id AS member_id,
      m.first_name AS member_first_name,
      m.last_name AS member_last_name,
      m.age AS member_age,
      m.sex AS member_sex,
      j.id AS judge_id,
      j.first_name || ' ' || j.last_name AS judge_name,
      s.value AS score_value,
      s.score_type,
      vc.competitor_id IS NOT NULL AS is_validated
    FROM competitors c
    LEFT JOIN competitor_members m ON m.competitor_id = c.id
    CROSS JOIN judges j
    LEFT JOIN scores s 
      ON s.judge_id = j.id 
     AND s.competitor_id = c.id
    LEFT JOIN validated_competitors vc ON vc.competitor_id = c.id
    WHERE c.category = $1
    ORDER BY c.id, m.id, j.id;
  `;

  const result = await db.query(query, [category]);

  const grouped: Record<number, any> = {};

  for (const row of result.rows) {
    if (!grouped[row.competitor_id]) {
      grouped[row.competitor_id] = {
        id: row.competitor_id,
        category: row.category,
        club: row.club,
        members: [],
        scores: {},
        is_validated: row.is_validated,
      };
    }

    if (
      row.member_id &&
      !grouped[row.competitor_id].members.find((m: any) => m.id === row.member_id)
    ) {
      grouped[row.competitor_id].members.push({
        id: row.member_id,
        first_name: row.member_first_name,
        last_name: row.member_last_name,
        age: row.member_age,
        sex: row.member_sex,
      });
    }

    if (row.judge_id) {
      grouped[row.competitor_id].scores[row.judge_name] = {
        value: row.score_value !== null ? Number(row.score_value) : "N/A",
        type: row.score_type || null,
      };
    }
  }

  return Object.values(grouped);
};

// ✅ Validate competitor with total_score
export const validateCompetitorById = async (competitorId: number, totalScore: number) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `INSERT INTO validated_competitors (competitor_id, total_score) 
       VALUES ($1, $2)
       ON CONFLICT (competitor_id) DO UPDATE 
       SET total_score = EXCLUDED.total_score,
           validated_at = NOW();`,   // update timestamp if re-validated
      [competitorId, totalScore]
    );

    await client.query(
      `DELETE FROM current_vote WHERE competitor_id = $1;`,
      [competitorId]
    );

    await client.query("COMMIT");
    return { competitorId, totalScore, success: true };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export const unvalidateCompetitorById = async (competitorId: number) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    // Remove from validated_competitors only
    await client.query(
      `DELETE FROM validated_competitors WHERE competitor_id = $1;`,
      [competitorId]
    );

    await client.query("COMMIT");
    return { success: true };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export async function findCompetitorById(id: number) {
  const result = await db.query("SELECT * FROM competitors WHERE id = $1", [id]);
  return result.rows[0] || null;
}

export const countCompetitors = async () => {
  const result = await db.query("SELECT COUNT(*) AS total FROM competitors");
  return parseInt(result.rows[0].total, 10);
};

// Count distinct categories
export const countCategories = async () => {
  const result = await db.query(
    "SELECT COUNT(DISTINCT category) AS categories FROM competitors"
  );
  return parseInt(result.rows[0].categories, 10);
};