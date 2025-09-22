import "dotenv/config";
import express from "express";
import path from "path";

import competitorRoutes from "./routes/competitorRoutes";
import judgeRoutes from "./routes/judgeRoutes";
import scoreRoutes from "./routes/scoreRoutes";
import voteRoutes from "./routes/voteRoutes";
import rankingRoutes from "./routes/rankingRoutes";
import showRoutes from "./routes/showRoutes";
import logRoutes from "./routes/logRoutes";
import { createTables } from "./db"; // ✅ import table creator

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// ✅ Views from compiled dist folder
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ✅ Serve static assets
app.use("/static", express.static(path.join(__dirname, "..", "public", "static")));

// ✅ Routes
app.use("/api", competitorRoutes);
app.use("/api", judgeRoutes);
app.use("/api", scoreRoutes);
app.use("/api", voteRoutes);
app.use("/", rankingRoutes);
app.use("/api", showRoutes);
app.use("/api/logs", logRoutes);

// ✅ Ensure tables exist before starting the server
createTables()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to initialize database tables:", err);
    process.exit(1); // stop app if DB init fails
  });

export default app;
