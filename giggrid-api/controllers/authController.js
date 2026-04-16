const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");

function generateToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

function sanitizeUser(user) {
  return typeof user.toJSON === "function" ? user.toJSON() : user;
}

exports.register = async (req, res) => {
  try {
    const { email, password, full_name, phone, qualification, preferences, bio, role, company_name, company_website } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ error: "Email, password, and role are required." });
    }

    if (role === "admin") {
      return res.status(403).json({ error: "Admin registration is not allowed." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      _id: crypto.randomUUID(),
      email: normalizedEmail,
      password: hashedPassword,
      full_name: full_name || "",
      phone: phone || "",
      qualification: qualification || "",
      preferences: preferences || "",
      bio: bio || "",
      role,
      company_name: company_name ?? null,
      company_website: company_website ?? null,
    });

    return res.status(201).json({
      token: generateToken(user._id),
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ error: error.message || "Registration failed." });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    return res.status(200).json({
      token: generateToken(user._id),
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: error.message || "Login failed." });
  }
};

exports.getMe = async (req, res) => {
  return res.status(200).json({ user: sanitizeUser(req.user) });
};
