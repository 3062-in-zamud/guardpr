import express from "express";

const app = express();

// True positive: sensitive API route without authentication
app.get("/api/billing/invoices", (req, res) => {
  res.json({ invoices: [] });
});

app.post("/api/billing/charge", (req, res) => {
  res.json({ charged: true });
});

export default app;
