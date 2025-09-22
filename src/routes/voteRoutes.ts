import { Router } from "express";
import { startVote, stopVote, getCurrentVote } from "../controllers/voteController";

const router = Router();

router.post("/votes/start", startVote);
router.post("/votes/stop", stopVote);
router.get("/votes/current", getCurrentVote);

export default router;
