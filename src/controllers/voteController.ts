import { Request, Response } from "express";
import { setCurrentVote, clearVote, fetchCurrentVote } from "../models/voteModel";
import { findCompetitorById } from "../models/competitorModel";
import { findJudgeById } from "../models/judgeModel";
import { validateCompetitorId } from "../utils/validators";

// ▶️ Start a vote for a competitor
export const startVote = async (req: Request, res: Response) => {
  try {
    const competitorId = validateCompetitorId(req.body.competitor_id, res);
    if (competitorId === null) return;

    const competitor = await findCompetitorById(competitorId);
    if (!competitor) {
      return res.status(404).json({ error: "Competitor not found" });
    }

    await setCurrentVote(competitorId);
    res.json({ success: true, competitor_id: competitorId });
  } catch (err) {
    console.error("Error starting vote:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ⏹ Stop the current vote
export const stopVote = async (_req: Request, res: Response) => {
  try {
    const activeVote = await fetchCurrentVote();
    if (!activeVote) {
      return res.status(404).json({ error: "No active vote to stop" });
    }

    await clearVote();
    res.json({ success: true, message: "Vote stopped" });
  } catch (err) {
    console.error("Error stopping vote:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// 📥 Get the current vote state (optionally filtered by judge)
export const getCurrentVote = async (req: Request, res: Response) => {
  try {
    let judgeId: number | undefined;

    if (req.query.judge_id) {
      judgeId = parseInt(req.query.judge_id as string, 10);
      if (isNaN(judgeId) || judgeId <= 0) {
        return res.status(400).json({ error: "Invalid judge_id" });
      }

      const judge = await findJudgeById(judgeId);
      if (!judge) {
        return res.status(404).json({ error: "Judge not found" });
      }
    }

    const vote = await fetchCurrentVote(judgeId);
    if (!vote) {
      return res.json({ competitor_id: null });
    }

    res.json(vote);
  } catch (err) {
    console.error("Error fetching current vote:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
