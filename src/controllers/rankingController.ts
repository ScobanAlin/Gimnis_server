import { Request, Response } from "express";
import { fetchRankings } from "../models/rankingModel";
import { validateCategory } from "../utils/validators";

// 🎯 Render EJS shell
export const showRankings = async (_req: Request, res: Response) => {
  res.render("rankings");
};

// 📊 API: Get all rankings
export const apiRankings = async (_req: Request, res: Response) => {
  try {
    const rankings = await fetchRankings();
    if (!rankings || Object.keys(rankings).length === 0) {
      return res.status(404).json({ error: "No rankings available" });
    }
    res.json(rankings);
  } catch (err) {
    console.error("Error fetching rankings:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 📊 API: Rankings by category
export const rankingsByCategory = async (req: Request, res: Response) => {
  const category = req.params.category;

  if (!validateCategory(category, res)) return;

  try {
    const allRankings = await fetchRankings();
    const filteredRankings = allRankings[category] || [];

    if (filteredRankings.length === 0) {
      return res.status(404).json({ error: `No rankings found for category: ${category}` });
    }

    res.json(filteredRankings);
  } catch (err) {
    console.error("Error fetching rankings by category:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
