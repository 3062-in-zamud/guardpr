import express from "express";

const router = express.Router();

// True positive: admin route with no auth middleware
router.get("/api/admin/users", (req, res) => {
  res.json({ users: [] });
});

export default router;
