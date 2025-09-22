import { Router } from "express";
import {
  getJudgeScores,
  getAllScores,
  getAllJudges,
  loginJudge,
} from "../controllers/judgeController";

const router = Router();

router.get("/judges/:id/scores", getJudgeScores);
router.get("/scores", getAllScores);
router.get("/judges", getAllJudges);
router.put("/judges/:id/login", loginJudge);

export default router;
