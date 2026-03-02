import express from "express";

const app = express();

// Middleware definitions (not applied to all routes)
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

// Public route - OK, no auth needed
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Vulnerable: admin route without any auth middleware
app.get("/api/admin/users", (req, res) => {
  res.json({ users: [] });
});

// Vulnerable: admin route without isAdmin middleware
app.post("/api/admin/users", (req, res) => {
  res.json({ created: true });
});

// Vulnerable: admin delete without auth
app.delete("/api/admin/users/:id", (req, res) => {
  res.json({ deleted: true });
});

// Vulnerable: settings route without auth
app.put("/api/admin/settings", (req, res) => {
  res.json({ updated: true });
});

// Protected route - OK, has isAuthenticated
app.get("/api/profile", isAuthenticated, (req, res) => {
  res.json({ user: req.session?.user });
});

// Protected admin route - OK, has both auth middleware
app.get("/api/admin/dashboard", isAuthenticated, isAdmin, (req, res) => {
  res.json({ dashboard: {} });
});

export default app;
