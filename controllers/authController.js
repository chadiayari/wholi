//contollers/authController.js
const jwt = require("jsonwebtoken");
const Admin = require("../Models/admins.Model");
const createError = require("http-errors");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const loginAdmin = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const admin = await Admin.findOne({ username });

    if (!admin) {
      return next(createError(401, "Invalid credentials"));
    }

    const isMatch = password === admin.password;

    if (!isMatch) {
      return next(createError(401, "Invalid credentials"));
    }

    const token = generateToken(admin._id);

    res.json({
      _id: admin._id,
      username: admin.username,
      token: token,
      success: true,
    });
  } catch (error) {
    console.error("Login error:", error);
    next(error);
  }
};

const verifyToken = async (req, res) => {
  res.json({ valid: true });
};

module.exports = {
  loginAdmin,
  verifyToken,
};
