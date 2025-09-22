import { Router } from "express";
import {
  getCompetitorCount,
  getCategoryCount,
  createCompetitor,
  deleteCompetitor,
  getAllcompetitors,
  getCompetitorsByCategory,
  validateCompetitor,
  unvalidateCompetitor,

} from "../controllers/competitorController";

const router = Router();

router.get("/competitors/count", getCompetitorCount);
router.get("/competitors/categories/count", getCategoryCount);

// 📋 Competitors CRUD
router.get("/competitors", getAllcompetitors);
router.get("/competitors/by-category", getCompetitorsByCategory);
router.post("/competitors", createCompetitor);
router.delete("/competitors/:id", deleteCompetitor);

// ✅ Validation
router.post("/scores/:id/validate", validateCompetitor);
router.delete("/scores/:id/unvalidate", unvalidateCompetitor);
export default router;
