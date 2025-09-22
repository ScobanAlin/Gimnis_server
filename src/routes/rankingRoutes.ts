import express from "express";
import { showRankings, apiRankings } from "../controllers/rankingController";

const router = express.Router();

router.get("/rankings", showRankings);
router.get("/api/rankings", apiRankings);
export default router;