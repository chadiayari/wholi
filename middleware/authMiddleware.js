const jwt = require("jsonwebtoken");
const Admin = require("../Models/admins.Model");
const createError = require("http-errors");

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.admin = await Admin.findById(decoded.id).select("-password");

      if (!req.admin) {
        return next(createError(401, "Not authorized"));
      }

      next();
    } catch (error) {
      console.error(error);
      return next(createError(401, "Not authorized, token failed"));
    }
  }

  if (!token) {
    return next(createError(401, "Not authorized, no token"));
  }
};

module.exports = { protect };
