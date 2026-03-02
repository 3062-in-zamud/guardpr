import express from "express";

const router = express.Router();

function isAuthenticated(req: any, res: any, next: any) {
  next();
}

// True positive: admin route has isAuthenticated but not isAdmin
router.get("/api/admin/dashboard", isAuthenticated, (req, res) => {
  res.json({ dashboard: {} });
});

export default router;
