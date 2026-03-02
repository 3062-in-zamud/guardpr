import express from "express";

const router = express.Router();

// True positive: admin DELETE route without auth
router.delete("/api/admin/users/:id", (req, res) => {
  res.json({ deleted: true });
});

export default router;
