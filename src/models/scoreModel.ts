import db from "../db";

// 🔄 Upsert score (judge voting)
export const setScore = async (
  judge_id: number,
  competitor_id: number,
  value: number,
  score_type: string
) => {
  const query = `
    INSERT INTO scores (judge_id, competitor_id, value, score_type)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (judge_id, competitor_id, score_type)
    DO UPDATE SET value = EXCLUDED.value
    RETURNING *;
  `;
  const result = await db.query(query, [
    judge_id,
    competitor_id,
    value,
    score_type,
  ]);
  return result.rows[0];
};

// 📥 Fetch scores for a competitor (with score_type)
export const fetchScoresByCompetitor = async (competitorId: number) => {
  const query = `
    SELECT j.id AS judge_id,
           j.first_name || ' ' || j.last_name AS judge_name,
           j.role AS judge_role,
           s.score_type,
           s.value
    FROM judges j
    LEFT JOIN scores s 
      ON s.judge_id = j.id 
     AND s.competitor_id = $1
    ORDER BY j.id, s.score_type;
  `;
  const result = await db.query(query, [competitorId]);
  return result.rows;
};

export const deleteScoreModel = async (
  competitor_id: number,
  score_type: string,
  judge_id?: number
) => {
  if (score_type === "difficulty") {
    // Delete BOTH difficulty + penalization for ALL difficulty judges
    const query = `
      DELETE FROM scores
      WHERE competitor_id = $1
      AND score_type IN ('difficulty','difficulty_penalization')
      AND judge_id IN (SELECT id FROM judges WHERE role = 'difficulty')
    `;
    await db.query(query, [competitor_id]);
    return { deleted: "all difficulty judges" };
  } else {
    if (!judge_id) {
      throw new Error("judge_id required for non-difficulty deletions");
    }
    const query = `
      DELETE FROM scores
      WHERE judge_id = $1
      AND competitor_id = $2
      AND score_type = $3
    `;
    await db.query(query, [judge_id, competitor_id, score_type]);
    return { deleted: `judge ${judge_id}, type ${score_type}` };
  }
};