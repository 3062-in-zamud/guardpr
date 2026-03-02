import express from "express";

const app = express();

// Public routes — OK
app.get("/", (req, res) => {
  res.send("Home");
});

app.get("/about", (req, res) => {
  res.send("About");
});

// Admin routes — MISSING auth middleware
app.get("/api/admin/users", (req, res) => {
  res.json({ users: [] });
});

app.post("/api/admin/users", (req, res) => {
  res.json({ created: true });
});

app.delete("/api/admin/users/:id", (req, res) => {
  res.json({ deleted: true });
});

// API routes — also missing auth
app.get("/api/data", (req, res) => {
  res.json({ data: [] });
});
