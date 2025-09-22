// utils/validators.ts
import { Response } from "express";

// Allowed categories
export const categories = [
  "Individual Men - Kids Development",
  "Individual Women - Kids Development",
  "Mixed Pair - Kids Development",
  "Trio - Kids Development",
  "Group - Kids Development",
  "Individual Men - National Development",
  "Individual Women - National Development",
  "Mixed Pair - National Development",
  "Trio - National Development",
  "Group - National Development",
  "Individual Men - Youth",
  "Individual Women - Youth",
  "Mixed Pair - Youth",
  "Trio - Youth",
  "Group - Youth",
  "Aerobic Dance - Youth",
  "Individual Men - Juniors",
  "Individual Women - Juniors",
  "Mixed Pair - Juniors",
  "Trio - Juniors",
  "Group - Juniors",
  "Aerobic Dance - Juniors",
  "Individual Men - Seniors",
  "Individual Women - Seniors",
  "Mixed Pair - Seniors",
  "Trio - Seniors",
  "Group - Seniors",
  "Aerobic Dance - Seniors",
];

// --- Category validation ---
export function validateCategory(category: string, res: Response): boolean {
  if (!category || !categories.includes(category)) {
    res.status(400).json({ error: "Invalid or missing category" });
    return false;
  }
  return true;
}

// --- Expected member count per category ---
export function getExpectedMemberCount(category: string): [number, number] {
  if (category.includes("Individual")) return [1, 1];
  if (category.includes("Pair")) return [2, 2];
  if (category.includes("Trio")) return [3, 3];
  if (category.includes("Group")) return [5, 5];
  if (category.includes("Dance")) return [6, 8];
  return [1, 999];
}

// --- Score validation ---
export function validateScore(score: any, res: Response): number | null {
  const value = parseFloat(score);
  if (isNaN(value) || value < 0 || value > 10) {
    res.status(400).json({ error: "Score must be between 0 and 10" });
    return null;
  }
  return value;
}

// --- Total score validation ---
export function validateTotalScore(score: any, res: Response): number | null {
  const value = parseFloat(score);
  if (isNaN(value) || value < 0 || value > 30) {
    res.status(400).json({ error: "Total score must be between 0 and 30" });
    return null;
  }
  return value;
}

// --- Competitor ID validation ---
export function validateCompetitorId(id: any, res: Response): number | null {
  const value = parseInt(id, 10);
  if (isNaN(value)) {
    res.status(400).json({ error: "Invalid competitor ID" });
    return null;
  }
  return value;
}
