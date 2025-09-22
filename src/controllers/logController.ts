// src/controllers/logController.ts
import { Request, Response } from "express";
import { addLog, getLogs } from "../models/logModel";

export const createLog = (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }
    const entry = addLog(message);
    console.log(`[LOG] ${entry.timestamp}: ${entry.message}`);

    res.json({ success: true, entry });
  } catch (err) {
    console.error("Error creating log:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const listLogs = (_req: Request, res: Response) => {
  try {
    res.json(getLogs());
  } catch (err) {
    res.status(500).json({ error: "Could not fetch logs" });
  }
};
