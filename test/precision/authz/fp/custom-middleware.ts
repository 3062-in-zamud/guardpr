import express from "express";

const router = express.Router();

function requireAuth(req: any, res: any, next: any) {
  if (req.headers.authorization) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

// False positive: uses requireAuth (one of the default auth middleware names)
router.get("/api/admin/users", requireAuth, (req, res) => {
  res.json({ users: [] });
});

export default router;
