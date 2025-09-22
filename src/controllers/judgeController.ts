import { Request, Response } from "express";
import {
  fetchJudgeScores,
  fetchAllScores,
  fetchAllJudges,
  findJudgeById,
  updateJudgeName,
} from "../models/judgeModel";

import { validateCompetitorId } from "../utils/validators";

// 📝 Get scores given by a specific judge
export const getJudgeScores = async (req: Request, res: Response) => {
  const judgeId = validateCompetitorId(req.params.id, res);
  if (judgeId === null) return;

  try {
    const judge = await findJudgeById(judgeId);
    if (!judge) {
      return res.status(404).json({ error: "Judge not found" });
    }

    const scores = await fetchJudgeScores(judgeId);
    if (!scores || scores.length === 0) {
      return res.status(404).json({ error: "No scores found for this judge" });
    }

    res.json(scores);
  } catch (error: any) {
    console.error("Error fetching judge scores:", error);
    res.status(500).json({ error: "Failed to fetch judge scores" });
  }
};

// 📊 Get all scores across all judges
export const getAllScores = async (_req: Request, res: Response) => {
  try {
    const scores = await fetchAllScores();
    if (!scores || scores.length === 0) {
      return res.status(404).json({ error: "No scores available" });
    }
    res.json(scores);
  } catch (error: any) {
    console.error("Error fetching all scores:", error);
    res.status(500).json({ error: "Failed to fetch all scores" });
  }
};

// 👨‍⚖️ Get all judges
export const getAllJudges = async (_req: Request, res: Response) => {
  try {
    const judges = await fetchAllJudges();
    if (!judges || judges.length === 0) {
      return res.status(404).json({ error: "No judges found" });
    }
    res.json(judges);
  } catch (error: any) {
    console.error("Error fetching all judges:", error);
    res.status(500).json({ error: "Failed to fetch all judges" });
  }
};

// 👨‍⚖️ Judge Login (update their name on first login)
export const loginJudge = async (req: Request, res: Response) => {
  const judgeId = validateCompetitorId(req.params.id, res);
  if (judgeId === null) return;

  const { first_name, last_name } = req.body;

  if (!first_name || !last_name) {
    return res
      .status(400)
      .json({ error: "First name and last name are required" });
  }

  try {
    const judge = await findJudgeById(judgeId);
    if (!judge) {
      return res.status(404).json({ error: "Judge not found" });
    }

    const updatedJudge = await updateJudgeName(judgeId, first_name, last_name);

    res.json({
      success: true,
      judge: updatedJudge,
    });
  } catch (error: any) {
    console.error("Error logging in judge:", error);
    res.status(500).json({ error: "Failed to log in judge" });
  }
};
