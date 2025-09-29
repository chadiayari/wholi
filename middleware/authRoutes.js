const express = require("express");
const router = express.Router();
const { loginAdmin, verifyToken } = require("../controllers/authController");
const { protect } = require("./authMiddleware");

router.post("/login", loginAdmin);

router.get("/verify", protect, verifyToken);

module.exports = router;
