require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const projectRoutes = require("./routes/projectRoutes");
const bidRoutes = require("./routes/bidRoutes");

const app = express();
const PORT = Number(process.env.PORT || 5000);

connectDB();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: false,
  }),
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", db: "mongodb" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/bids", bidRoutes);

app.use((err, _req, res, _next) => {
  console.error("Unhandled server error:", err);
  res.status(500).json({ error: err.message || "Internal server error." });
});

app.listen(PORT, () => {
  console.log(`GigGrid API listening on http://localhost:${PORT}`);
});
