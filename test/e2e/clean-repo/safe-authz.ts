import express from "express";

const app = express();

function isAuthenticated(req: any, res: any, next: any) {
  if (req.session?.user) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

function isAdmin(req: any, res: any, next: any) {
  if (req.session?.user?.role === "admin") {
    return next();
  }
  res.status(403).json({ error: "Forbidden" });
}

// Public route - correctly unprotected
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Protected with isAuthenticated - correct
app.get("/api/profile", isAuthenticated, (req, res) => {
  res.json({ user: req.session?.user });
});

// Protected with isAuthenticated + isAdmin - correct
app.get("/api/admin/users", isAuthenticated, isAdmin, (req, res) => {
  res.json({ users: [] });
});

// Protected with isAuthenticated + isAdmin - correct
app.post("/api/admin/users", isAuthenticated, isAdmin, (req, res) => {
  res.json({ created: true });
});

// Protected with isAuthenticated + isAdmin - correct
app.delete("/api/admin/users/:id", isAuthenticated, isAdmin, (req, res) => {
  res.json({ deleted: true });
});

// Protected with isAuthenticated + isAdmin - correct
app.put("/api/admin/settings", isAuthenticated, isAdmin, (req, res) => {
  res.json({ updated: true });
});

export default app;
