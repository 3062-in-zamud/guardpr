import express from "express";

const router = express.Router();

// False positive: static content routes, not API endpoints
router.get("/", (req, res) => {
  res.sendFile("index.html");
});

router.get("/about", (req, res) => {
  res.sendFile("about.html");
});

router.get("/login", (req, res) => {
  res.sendFile("login.html");
});

export default router;
