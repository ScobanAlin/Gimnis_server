import "dotenv/config";
import express from "express";
import path from "path";

import competitorRoutes from "./routes/competitorRoutes";
import judgeRoutes from "./routes/judgeRoutes";
import scoreRoutes from "./routes/scoreRoutes";
import voteRoutes from "./routes/voteRoutes";
import rankingRoutes from "./routes/rankingRoutes";
import showRoutes from "./routes/showRoutes";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// ✅ Use __dirname so it works after build
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ✅ Static files also from dist
app.use("/static", express.static(path.join(__dirname, "..", "public", "static")));

app.use("/api", competitorRoutes);
app.use("/api", judgeRoutes);
app.use("/api", scoreRoutes);
app.use("/api", voteRoutes);
app.use("/", rankingRoutes);
app.use("/api", showRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});

export default app;