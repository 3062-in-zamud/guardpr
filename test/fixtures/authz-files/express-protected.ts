import express from "express";

const app = express();

function isAuthenticated(req: any, res: any, next: any) {
  if (req.user) next();
  else res.status(401).send("Unauthorized");
}

function isAdmin(req: any, res: any, next: any) {
  if (req.user?.role === "admin") next();
  else res.status(403).send("Forbidden");
}

// Public routes
app.get("/", (req, res) => {
  res.send("Home");
});

// Protected admin routes — WITH auth middleware
app.get("/api/admin/users", isAuthenticated, isAdmin, (req, res) => {
  res.json({ users: [] });
});

app.post("/api/admin/users", isAuthenticated, isAdmin, (req, res) => {
  res.json({ created: true });
});

app.delete("/api/admin/users/:id", isAuthenticated, isAdmin, (req, res) => {
  res.json({ deleted: true });
});

// API routes — with auth
app.get("/api/data", isAuthenticated, (req, res) => {
  res.json({ data: [] });
});
