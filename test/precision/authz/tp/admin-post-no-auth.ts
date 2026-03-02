import express from "express";

const router = express.Router();

// True positive: admin POST route without auth
router.post("/api/admin/settings", (req, res) => {
  res.json({ updated: true });
});

export default router;
