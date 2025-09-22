// models/showModel.ts
import db from "../db";

export const getShowState = async () => {
  const query = `
    SELECT 
      sc.competitor_id,
      c.category,
      c.club,
      m.first_name,
      m.last_name,
      vc.total_score
    FROM show_competitor sc
    JOIN competitors c ON c.id = sc.competitor_id
    LEFT JOIN competitor_members m ON m.competitor_id = c.id
    LEFT JOIN validated_competitors vc ON vc.competitor_id = c.id
    LIMIT 1;
  `;

  const result = await db.query(query);

  if (result.rows.length === 0) {
    return { mode: "banner" }; // default banner state
  }

  const row = result.rows[0];
  return {
    mode: "competitor",
    competitor_id: row.competitor_id,
    category: row.category,
    club: row.club,
    competitor: `${row.first_name} ${row.last_name}`, // can be expanded to multiple members
    total_score: row.total_score,
  };
};

export const setShowCompetitor = async (competitorId: number) => {
  const query = `
    INSERT INTO show_competitor (competitor_id, started_at)
    VALUES ($1, NOW())
    ON CONFLICT (competitor_id)
    DO UPDATE SET competitor_id = EXCLUDED.competitor_id,
                  started_at = NOW()
    RETURNING competitor_id, started_at;
  `;
  const res = await db.query(query, [competitorId]);
  return res.rows[0];
};

export const getActiveShow = async () => {
  // delete if expired (older than 20)
  await db.query(`DELETE FROM show_competitor WHERE started_at < NOW() - INTERVAL '20 seconds'`);
  const res = await db.query(`SELECT * FROM show_competitor LIMIT 1`);
  return res.rows[0] || null;
};

export const clearShow = async () => {
  await db.query(`DELETE FROM show_competitor`);
};