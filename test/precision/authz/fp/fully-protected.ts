import express from "express";

const router = express.Router();

function isAuthenticated(req: any, res: any, next: any) {
  next();
}

function isAdmin(req: any, res: any, next: any) {
  next();
}

// False positive: admin route with both isAuthenticated and isAdmin
router.get("/api/admin/users", isAuthenticated, isAdmin, (req, res) => {
  res.json({ users: [] });
});

router.post("/api/admin/users", isAuthenticated, isAdmin, (req, res) => {
  res.json({ created: true });
});

export default router;
