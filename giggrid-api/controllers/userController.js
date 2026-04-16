const User = require("../models/User");

exports.getAllUsers = async (_req, res) => {
  try {
    const users = await User.find().select("-password").sort({ created_at: -1 });
    return res.status(200).json(users.map((user) => user.toJSON()));
  } catch (_error) {
    return res.status(500).json({ error: "Failed to fetch users." });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    if (req.user.role !== "admin" && req.user._id !== req.params.id) {
      return res.status(403).json({ error: "Not authorized to view this profile." });
    }

    return res.status(200).json(user.toJSON());
  } catch (_error) {
    return res.status(500).json({ error: "Failed to fetch user." });
  }
};

exports.updateUser = async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user._id !== req.params.id) {
      return res.status(403).json({ error: "Not authorized to update this profile." });
    }

    const allowedFields = {
      full_name: req.body.full_name,
      phone: req.body.phone,
      bio: req.body.bio,
      qualification: req.body.qualification,
      preferences: req.body.preferences,
      company_name: req.body.company_name,
      company_website: req.body.company_website,
    };

    const updates = Object.fromEntries(Object.entries(allowedFields).filter(([, value]) => value !== undefined));

    const updated = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!updated) {
      return res.status(404).json({ error: "User not found." });
    }

    return res.status(200).json(updated.toJSON());
  } catch (_error) {
    return res.status(500).json({ error: "Failed to update user." });
  }
};
