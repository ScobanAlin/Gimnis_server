import { Request, Response } from "express";
import { setScore, fetchScoresByCompetitor, deleteScoreModel } from "../models/scoreModel";
import { findCompetitorById } from "../models/competitorModel";
import { findJudgeById } from "../models/judgeModel";

import {
  validateCompetitorId,
  validateScore,
} from "../utils/validators";

// Allowed score types
const allowedScoreTypes = ["execution", "artistry", "difficulty", "principal_penalization","line_penalization","difficulty_penalization"];

// 📝 Judge submits or updates a single score
export const submitScore = async (req: Request, res: Response) => {
  try {
    let { judge_id, competitor_id, value, score_type } = req.body;

    const judgeId = validateCompetitorId(judge_id, res);
    const competitorId = validateCompetitorId(competitor_id, res);
    const scoreValue = validateScore(value, res);
    if (judgeId === null || competitorId === null || scoreValue === null) return;

    if (!score_type || !allowedScoreTypes.includes(score_type)) {
      return res.status(400).json({ error: "Invalid score_type" });
    }

    // Check that judge exists
    const judge = await findJudgeById(judgeId);
    if (!judge) return res.status(404).json({ error: "Judge not found" });

    // Check that competitor exists
    const competitor = await findCompetitorById(competitorId);
    if (!competitor) return res.status(404).json({ error: "Competitor not found" });

    const score = await setScore(judgeId, competitorId, scoreValue, score_type);

    res.status(201).json({
      success: true,
      message: "Score updated",
      score,
    });
  } catch (err) {
    console.error("Error submitting score:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// 📥 Get all scores for one competitor
export const getScoresByCompetitor = async (req: Request, res: Response) => {
  try {
    const competitorId = validateCompetitorId(req.params.competitorId, res);
    if (competitorId === null) return;

    const competitor = await findCompetitorById(competitorId);
    if (!competitor) return res.status(404).json({ error: "Competitor not found" });

    const rows = await fetchScoresByCompetitor(competitorId);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "No scores found for this competitor" });
    }

    // Organize by judge + score_type
    const scores: Record<string, number | null> = {};
    const judge_ids: Record<string, number> = {};

    rows.forEach((row) => {
      const key = `${row.judge_name} (${row.score_type})`;
      scores[key] = row.value ?? null;
      judge_ids[key] = row.judge_id;
    });

    res.json({
      competitor_id: competitorId,
      scores,
      judge_ids,
    });
  } catch (err) {
    console.error("Error fetching scores:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteScore = async (req: Request, res: Response) => {
  try {
    const { judge_id, competitor_id, score_type } = req.body;

    const competitorId = validateCompetitorId(competitor_id, res);
    const judgeId = validateCompetitorId(judge_id, res);
    if (competitorId === null || judgeId === null) return;

    if (!score_type || !allowedScoreTypes.includes(score_type)) {
      return res.status(400).json({ error: "Invalid or missing score_type" });
    }

    // Ensure competitor exists
    const competitor = await findCompetitorById(competitorId);
    if (!competitor) return res.status(404).json({ error: "Competitor not found" });

    // Ensure judge exists
    const judge = await findJudgeById(judgeId);
    if (!judge) return res.status(404).json({ error: "Judge not found" });

    const result = await deleteScoreModel(competitorId, score_type, judgeId);

    if (!result) {
      return res.status(404).json({ error: "Score not found for given competitor, judge, and type" });
    }

    res.json({
      success: true,
      message: `Deleted ${score_type} score`,
      details: result,
    });
  } catch (err: any) {
    console.error("Error deleting score:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
