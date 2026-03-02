import express from "express";

const router = express.Router();

// False positive: public health check route, does not need auth
router.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// False positive: public documentation route
router.get("/api/docs", (req, res) => {
  res.json({ version: "1.0" });
});

export default router;
