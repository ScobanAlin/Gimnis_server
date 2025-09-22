import { Request, Response } from "express";
import {
  getShowState,
  setShowCompetitor,
  getActiveShow,
  clearShow,
} from "../models/showModel";
import { findCompetitorById } from "../models/competitorModel";
import { validateCompetitorId } from "../utils/validators";

// 🎥 Render EJS shell
export const showLive = async (_req: Request, res: Response) => {
  res.render("show");
};

// 📡 API: Get raw show state
export const apiShowState = async (_req: Request, res: Response) => {
  try {
    const state = await getShowState();
    if (!state) {
      return res.status(404).json({ error: "No show state available" });
    }
    res.json(state);
  } catch (err) {
    console.error("Error fetching live state:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ▶️ Start a new show
export const startShow = async (req: Request, res: Response) => {
  try {
    const competitorId = validateCompetitorId(req.params.id, res);
    if (competitorId === null) return;

    const competitor = await findCompetitorById(competitorId);
    if (!competitor) {
      return res.status(404).json({ error: "Competitor not found" });
    }

    // (optional rule) ensure only one active show at a time
    const active = await getActiveShow();
    if (active && active.competitor_id === competitorId) {
      return res.status(400).json({ error: "Competitor is already in the show" });
    }

    const result = await setShowCompetitor(competitorId);
    res.json({ success: true, show: result });
  } catch (err) {
    console.error("Error starting show:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 🎬 Get the currently active show
export const getShow = async (_req: Request, res: Response) => {
  try {
    const active = await getActiveShow();
    if (!active) {
      return res.status(404).json({ error: "No active show" });
    }
    res.json({ show: active });
  } catch (err) {
    console.error("Error fetching show:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ⏹ Stop the active show
export const stopShow = async (_req: Request, res: Response) => {
  try {
    const active = await getActiveShow();
    if (!active) {
      return res.status(404).json({ error: "No active show to stop" });
    }

    await clearShow();
    res.json({ success: true, message: "Show cleared" });
  } catch (err) {
    console.error("Error stopping show:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
