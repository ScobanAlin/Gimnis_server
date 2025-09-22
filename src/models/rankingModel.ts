import db from "../db";

// helper: middle 2 average
function middleTwoAverage(arr: number[]): number {
  if (arr.length < 4) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return (sorted[1] + sorted[2]) / 2;
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
      };
    }

    // collect members (LastName FirstName format)
    if (
      row.member_id &&
      !grouped[row.competitor_id].members.includes(
        `${row.last_name} ${row.first_name}`
      )
    ) {
      grouped[row.competitor_id].members.push(
        `${row.last_name} ${row.first_name}`
      );
    }

    // collect scores
    if (row.score_type === "execution" && row.value != null)
      grouped[row.competitor_id].execution.push(Number(row.value));
    if (row.score_type === "artistry" && row.value != null)
      grouped[row.competitor_id].artistry.push(Number(row.value));
    if (row.score_type === "difficulty" && row.value != null)
      grouped[row.competitor_id].difficulty.push(Number(row.value));
    if (
      ["difficulty_penalization", "line_penalization", "principal_penalization"].includes(
        row.score_type
      ) &&
      row.value != null
    )
      grouped[row.competitor_id].penalties.push(Number(row.value));
  }

  // calculate averages + rankings
  const rankingsByCategory: Record<string, any[]> = {};

  Object.values(grouped).forEach((comp: any) => {
    const execution_avg = middleTwoAverage(comp.execution);
    const artistry_avg = middleTwoAverage(comp.artistry);
    const difficulty_val = comp.difficulty.length > 0 ? comp.difficulty[0] : 0;
    const penalties = comp.penalties.reduce((a: number, b: number) => a + b, 0);

    const calcTotal =
      execution_avg + artistry_avg + difficulty_val - penalties;

    if (!rankingsByCategory[comp.category]) {
      rankingsByCategory[comp.category] = [];
    }

    rankingsByCategory[comp.category].push({
      competitor_id: comp.competitor_id,       // ✅ added
      competitor: comp.members.join(" / "),    // show names
      club: comp.club,
      total_score: Number(comp.total_score),
      calc_total: calcTotal,
      execution_score: execution_avg,
      artistry_score: artistry_avg,
      difficulty_score: difficulty_val,
    });
  });

  // assign ranks with tie-handling
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
