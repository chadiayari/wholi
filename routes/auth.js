const express = require("express");
const { loginAdmin, verifyToken } = require("../controllers/authController");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

// POST /api/auth/login - Admin login
router.post("/login", loginAdmin);

// GET /api/auth/verify - Verify token
router.get("/verify", authenticateToken, verifyToken);

module.exports = router;
