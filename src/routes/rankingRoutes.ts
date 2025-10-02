import express from "express";
import { showRankings, apiRankings,fetchFullRankings } from "../controllers/rankingController";

const router = express.Router();

router.get("/rankings", showRankings);
router.get("/api/rankings", apiRankings);
router.get("/api/rankings/full", fetchFullRankings);

export default router;