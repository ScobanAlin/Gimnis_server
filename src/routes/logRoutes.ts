// src/routes/logRoutes.ts
import { Router } from "express";
import { createLog, listLogs } from "../controllers/logController";

const router = Router();

router.post("/", createLog);
router.get("/", listLogs);

export default router;
