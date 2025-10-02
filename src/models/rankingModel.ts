import db from "../db";

// 🟢 NEW: Helper to get allowed tolerance based on avg score
function getAllowedTolerance(avg: number): number {
  if (avg >= 8.0) return 0.3;
  if (avg >= 7.0) return 0.4;
  if (avg >= 6.0) return 0.5;
  return 0.6;
}

// 🟢 NEW: Apply FIG tolerance rules
function applyTolerance(arr: number[], label: string, competitorId: number): number {
  if (arr.length < 4) return 0;

  const sorted = [...arr].sort((a, b) => a - b);
  const middleTwo = [sorted[1], sorted[2]]; // 2nd and 3rd after sort
  const avgMiddle = (middleTwo[0] + middleTwo[1]) / 2;
  const diff = Math.abs(middleTwo[0] - middleTwo[1]);
  const allowed = getAllowedTolerance(avgMiddle);

  if (diff > allowed) {
    // 🟢 NEW: Tolerance exceeded → use average of all scores
    const allAvg = arr.reduce((a, b) => a + b, 0) / arr.length;
    return allAvg;
  }

  // 🟢 NEW: Within tolerance → average of middle two
  return avgMiddle;
}

export const fetchRankings = async () => {
  const query = `
    SELECT 
      c.category,
      c.id AS competitor_id,
      c.club,
      vc.total_score,
      s.judge_id,
      s.score_type,
      s.value,
      m.id AS member_id,
      m.first_name,
      m.last_name
    FROM validated_competitors vc
    JOIN competitors c ON c.id = vc.competitor_id
    LEFT JOIN scores s ON s.competitor_id = c.id
    LEFT JOIN competitor_members m ON m.competitor_id = c.id
    ORDER BY c.category, c.id, m.id, s.judge_id;
  `;

  const result = await db.query(query);

  // 🟢 Group competitors
  const grouped: Record<number, any> = {};

  for (const row of result.rows) {
    if (!grouped[row.competitor_id]) {
      grouped[row.competitor_id] = {
        competitor_id: row.competitor_id,
        category: row.category,
        club: row.club,
        total_score: Number(row.total_score),
        execution: [] as number[],
        artistry: [] as number[],
        difficulty: [] as number[],
        penalties: [] as number[],
        members: [] as string[],
        scoreKeys: new Set<string>(), // ✅ prevent duplicates
      };
    }

    const comp = grouped[row.competitor_id];

    // Collect members (LastName FirstName)
    if (row.member_id) {
      const memberName = `${row.last_name} ${row.first_name}`;
      if (!comp.members.includes(memberName)) {
        comp.members.push(memberName);
      }
    }

    // Collect scores (avoid duplicates caused by join with members)
    if (row.score_type && row.value != null) {
      const key = `${row.judge_id}-${row.score_type}`;
      if (!comp.scoreKeys.has(key)) {
        comp.scoreKeys.add(key);
        const val = Number(row.value);

        if (row.score_type === "execution") comp.execution.push(val);
        if (row.score_type === "artistry") comp.artistry.push(val);
        if (row.score_type === "difficulty") comp.difficulty.push(val);
        if (
          ["difficulty_penalization", "line_penalization", "principal_penalization"].includes(
            row.score_type
          )
        ) {
          comp.penalties.push(val);
        }
      }
    }
  }

  // 🟢 Calculate averages + rankings
  const rankingsByCategory: Record<string, any[]> = {};

  Object.values(grouped).forEach((comp: any) => {
    // 🟢 CHANGED: use tolerance logic instead of plain middleTwoAverage
    const execution_avg = applyTolerance(comp.execution, "Execution", comp.competitor_id);
    const artistry_avg = applyTolerance(comp.artistry, "Artistry", comp.competitor_id);

    const difficulty_val = comp.difficulty.length > 0 ? comp.difficulty[0] : 0;
    const penalties = comp.penalties.reduce((a: number, b: number) => a + b, 0);

    const calcTotal =
      execution_avg + artistry_avg + difficulty_val - penalties;

    if (!rankingsByCategory[comp.category]) {
      rankingsByCategory[comp.category] = [];
    }

    rankingsByCategory[comp.category].push({
      competitor_id: comp.competitor_id,
      competitor: comp.members.join(" / "), // show all names
      club: comp.club,
      total_score: Number(comp.total_score),
      calc_total: calcTotal,
      execution_score: execution_avg,
      artistry_score: artistry_avg,
      difficulty_score: difficulty_val,
    });
  });

  // 🟢 Assign ranks with tie-handling
  Object.keys(rankingsByCategory).forEach((cat) => {
    const list = rankingsByCategory[cat];

    list.sort((a, b) => {
      if (b.total_score !== a.total_score)
        return b.total_score - a.total_score;
      if (b.execution_score !== a.execution_score)
        return b.execution_score - a.execution_score;
      if (b.artistry_score !== a.artistry_score)
        return b.artistry_score - a.artistry_score;
      return b.difficulty_score - a.difficulty_score;
    });

    let last: any = null;
    let position = 0;
    let displayPos = 0;

    rankingsByCategory[cat] = list.map((item) => {
      position++;
      if (
        last &&
        last.total_score === item.total_score &&
        last.execution_score === item.execution_score &&
        last.artistry_score === item.artistry_score &&
        last.difficulty_score === item.difficulty_score
      ) {
        return { ...item, position: displayPos };
      } else {
        displayPos = position;
        last = item;
        return { ...item, position: displayPos };
      }
    });
  });

  return rankingsByCategory;
};


export const fetchFullRankingsModel = async () => {
  const query = `
    SELECT 
      c.category,
      c.id AS competitor_id,
      c.club,
      vc.total_score,
      s.judge_id,
      s.score_type,
      s.value,
      j.first_name || ' ' || j.last_name AS judge_name,
      j.role AS judge_role,
      m.id AS member_id,
      m.first_name,
      m.last_name
    FROM validated_competitors vc
    JOIN competitors c ON c.id = vc.competitor_id
    LEFT JOIN scores s ON s.competitor_id = c.id
    LEFT JOIN judges j ON j.id = s.judge_id
    LEFT JOIN competitor_members m ON m.competitor_id = c.id
    ORDER BY c.category, c.id, m.id, s.judge_id;
  `;

  const result = await db.query(query);

  const grouped: Record<number, any> = {};

  for (const row of result.rows) {
    if (!grouped[row.competitor_id]) {
      grouped[row.competitor_id] = {
        competitor_id: row.competitor_id,
        category: row.category,
        club: row.club,
        total_score: Number(row.total_score),
        execution: [] as number[],
        artistry: [] as number[],
        difficulty: [] as number[],
        penalties: [] as number[],
        members: [] as string[],
        scores: {} as Record<string, number | null>
      };
    }

    const comp = grouped[row.competitor_id];

    // Members
    if (row.member_id) {
      const memberName = `${row.last_name} ${row.first_name}`;
      if (!comp.members.includes(memberName)) {
        comp.members.push(memberName);
      }
    }

    // Scores
    if (row.score_type && row.value != null) {
      const val = Number(row.value);
      const key = `${row.judge_name} (${row.score_type})`;

      comp.scores[key] = val;

      if (row.score_type === "execution") comp.execution.push(val);
      if (row.score_type === "artistry") comp.artistry.push(val);
      if (row.score_type === "difficulty") comp.difficulty.push(val);
      if (
        ["difficulty_penalization", "line_penalization", "principal_penalization"].includes(
          row.score_type
        )
      ) {
        comp.penalties.push(val);
      }
    }
  }

  // Calculate totals
  const rankingsByCategory: Record<string, any[]> = {};

  Object.values(grouped).forEach((comp: any) => {
    const execution_avg = applyTolerance(comp.execution, "Execution", comp.competitor_id);
    const artistry_avg = applyTolerance(comp.artistry, "Artistry", comp.competitor_id);
    const difficulty_val = comp.difficulty.length > 0 ? comp.difficulty[0] : 0;
    const penalties = comp.penalties.reduce((a: number, b: number) => a + b, 0);

    const calcTotal = execution_avg + artistry_avg + difficulty_val - penalties;

    if (!rankingsByCategory[comp.category]) rankingsByCategory[comp.category] = [];

    rankingsByCategory[comp.category].push({
      competitor_id: comp.competitor_id,
      competitor: comp.members.join(" / "),
      club: comp.club,
      total_score: comp.total_score,
      calc_total: calcTotal,
      execution_score: execution_avg,
      artistry_score: artistry_avg,
      difficulty_score: difficulty_val,
      scores: comp.scores
    });
  });

  // Ranking positions with ties
  Object.keys(rankingsByCategory).forEach((cat) => {
    const list = rankingsByCategory[cat];
    list.sort((a, b) => {
      if (b.total_score !== a.total_score) return b.total_score - a.total_score;
      if (b.execution_score !== a.execution_score) return b.execution_score - a.execution_score;
      if (b.artistry_score !== a.artistry_score) return b.artistry_score - a.artistry_score;
      return b.difficulty_score - a.difficulty_score;
    });

    let last: any = null;
    let pos = 0;
    let displayPos = 0;

    rankingsByCategory[cat] = list.map((item: any) => {
      pos++;
      if (
        last &&
        last.total_score === item.total_score &&
        last.execution_score === item.execution_score &&
        last.artistry_score === item.artistry_score &&
        last.difficulty_score === item.difficulty_score
      ) {
        return { ...item, position: displayPos };
      } else {
        displayPos = pos;
        last = item;
        return { ...item, position: displayPos };
      }
    });
  });

  return rankingsByCategory;
};