import express from "express";
import {
  showLive,
  apiShowState,
  startShow,
  getShow,
  stopShow,
} from "../controllers/showController";

const router = express.Router();

router.get("/show", showLive);

router.get("/show/state", apiShowState);

router.get("/live", getShow);         
router.post("/live/:id", startShow);  
router.delete("/live", stopShow);     

export default router;