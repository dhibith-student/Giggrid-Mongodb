const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function protect(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    return res.status(401).json({ error: "Not authorized, no token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ error: "User associated with this token no longer exists." });
    }

    req.user = user;
    return next();
  } catch (_error) {
    return res.status(401).json({ error: "Not authorized, token is invalid or expired." });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role === "admin") {
    return next();
  }

  return res.status(403).json({ error: "Access denied. Admin only." });
}

module.exports = { protect, adminOnly };
