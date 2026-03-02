import express from "express";

const router = express.Router();

function isAuthenticated(req: any, res: any, next: any) {
  next();
}

function isAdmin(req: any, res: any, next: any) {
  next();
}

// False positive: auth applied at router level, covers all routes below
router.use(isAuthenticated);
router.use(isAdmin);

router.get("/api/admin/users", (req, res) => {
  res.json({ users: [] });
});

router.post("/api/admin/settings", (req, res) => {
  res.json({ updated: true });
});

export default router;
