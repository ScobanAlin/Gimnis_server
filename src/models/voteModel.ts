import db from "../db";

export const setCurrentVote = async (competitorId: number) => {
  await db.query("DELETE FROM current_vote");
  await db.query(
    "INSERT INTO current_vote (competitor_id) VALUES ($1)",
    [competitorId]
  );
};

export const clearVote = async () => {
  await db.query("DELETE FROM current_vote");
};

export const fetchCurrentVote = async (judgeId?: number) => {
  const competitorQuery = `
    SELECT cv.competitor_id,
           c.category,
           c.club,
           CASE 
             WHEN $1::int IS NOT NULL AND s.id IS NOT NULL 
             THEN true ELSE false 
           END AS already_voted
    FROM current_vote cv
    JOIN competitors c ON cv.competitor_id = c.id
    LEFT JOIN scores s 
      ON s.competitor_id = cv.competitor_id 
     AND s.judge_id = $1
    LIMIT 1;
  `;

  const competitorResult = await db.query(competitorQuery, [judgeId || null]);
  if (competitorResult.rows.length === 0) return null;

  const competitor = competitorResult.rows[0];

  // fetch members
  const membersResult = await db.query(
    `
    SELECT id, first_name, last_name, age, sex
    FROM competitor_members
    WHERE competitor_id = $1
    ORDER BY id;
    `,
    [competitor.competitor_id]
  );

  return {
    competitor_id: competitor.competitor_id,
    category: competitor.category,
    club: competitor.club,
    already_voted: competitor.already_voted,
    members: membersResult.rows,
  };
};
