import { Request, Response } from "express";
import {
  countCompetitors,
  countCategories,
  insertCompetitor,
  deleteCompetitorById,
  getAllCompetitors,
  fetchCompetitorsWithScores,
  validateCompetitorById,
  unvalidateCompetitorById,
  findCompetitorById, // 👉 must exist in your models
} from "../models/competitorModel";

import {
  validateCategory,
  getExpectedMemberCount,
  validateCompetitorId,
  validateTotalScore,
} from "../utils/validators";

// --- Create competitor ---
export const createCompetitor = async (req: Request, res: Response) => {
  const { category, club, members } = req.body;

  if (!category || !club || !Array.isArray(members)) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (!validateCategory(category, res)) return;

  const [min, max] = getExpectedMemberCount(category);
  if (members.length < min || members.length > max) {
    return res.status(400).json({
      error: `Invalid number of members for ${category}. Expected between ${min} and ${max}.`,
    });
  }

  try {
    const newCompetitor = await insertCompetitor(category, club, members);
    res.status(201).json(newCompetitor);
  } catch (err) {
    console.error("Error creating competitor:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// --- Delete competitor ---
export const deleteCompetitor = async (req: Request, res: Response) => {
  const competitorId = validateCompetitorId(req.params.id, res);
  if (competitorId === null) return;

  try {
    const existing = await findCompetitorById(competitorId);
    if (!existing) return res.status(404).json({ error: "Competitor not found" });

    const deleted = await deleteCompetitorById(competitorId);
    res.json(deleted);
  } catch (err) {
    console.error("Error deleting competitor:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// --- List all competitors ---
export const getAllcompetitors = async (_req: Request, res: Response) => {
  try {
    const competitors = await getAllCompetitors();
    res.json(competitors);
  } catch (err) {
    console.error("Error fetching competitors:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// --- List competitors by category ---
export const getCompetitorsByCategory = async (req: Request, res: Response) => {
  const category = req.query.category as string;
  if (!category) return res.status(400).json({ error: "Category required" });
  if (!validateCategory(category, res)) return;

  try {
    const competitors = await fetchCompetitorsWithScores(category);
    res.json(competitors);
  } catch (err) {
    console.error("Error fetching by category:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// --- Validate competitor ---
export const validateCompetitor = async (req: Request, res: Response) => {
  const competitorId = validateCompetitorId(req.params.id, res);
  const totalScore = validateTotalScore(req.body.totalScore, res);
  if (competitorId === null || totalScore === null) return;

  try {
    const existing = await findCompetitorById(competitorId);
    if (!existing) return res.status(404).json({ error: "Competitor not found" });

    const result = await validateCompetitorById(competitorId, totalScore);
    res.json({ message: "Competitor validated", ...result });
  } catch (err) {
    console.error("Error validating competitor:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// --- Unvalidate competitor ---
export const unvalidateCompetitor = async (req: Request, res: Response) => {
  const competitorId = validateCompetitorId(req.params.id, res);
  if (competitorId === null) return;

  try {
    const existing = await findCompetitorById(competitorId);
    if (!existing) return res.status(404).json({ error: "Competitor not found" });

    const result = await unvalidateCompetitorById(competitorId);
    res.json({ message: "Competitor unvalidated", ...result });
  } catch (err) {
    console.error("Error unvalidating competitor:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getCompetitorCount = async (_req: Request, res: Response) => {
  try {
    const total = await countCompetitors();
    res.json({ total });
  } catch (error: any) {
    console.error("Error fetching competitor count:", error);
    res.status(500).json({ error: "Failed to fetch competitor count" });
  }
};

// 📊 Distinct categories
export const getCategoryCount = async (_req: Request, res: Response) => {
  try {
    const categories = await countCategories();
    res.json({ categories });
  } catch (error: any) {
    console.error("Error fetching category count:", error);
    res.status(500).json({ error: "Failed to fetch category count" });
  }
};