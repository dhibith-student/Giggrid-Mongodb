const crypto = require("crypto");
const Project = require("../models/Project");
const Bid = require("../models/Bid");

exports.getAllProjects = async (_req, res) => {
  try {
    const projects = await Project.find().sort({ created_at: -1 });
    return res.status(200).json(projects.map((project) => project.toJSON()));
  } catch (_error) {
    return res.status(500).json({ error: "Failed to fetch projects." });
  }
};

exports.getOpenProjects = async (_req, res) => {
  try {
    const projects = await Project.find({ status: "open" }).sort({ created_at: -1 });
    return res.status(200).json(projects.map((project) => project.toJSON()));
  } catch (_error) {
    return res.status(500).json({ error: "Failed to fetch open projects." });
  }
};

exports.getClientProjects = async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user._id !== req.params.clientId) {
      return res.status(403).json({ error: "Not authorized to view these projects." });
    }

    const projects = await Project.find({
      client_id: req.params.clientId,
      status: { $ne: "removed" },
    }).sort({ created_at: -1 });

    return res.status(200).json(projects.map((project) => project.toJSON()));
  } catch (_error) {
    return res.status(500).json({ error: "Failed to fetch client projects." });
  }
};

exports.getProjectsByIds = async (req, res) => {
  try {
    const ids = String(req.query.ids || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (!ids.length) {
      return res.status(200).json([]);
    }

    const projects = await Project.find({ _id: { $in: ids } }).sort({ created_at: -1 });
    return res.status(200).json(projects.map((project) => project.toJSON()));
  } catch (_error) {
    return res.status(500).json({ error: "Failed to fetch projects by id." });
  }
};

exports.createProject = async (req, res) => {
  try {
    const { title, description, budget, category } = req.body;

    const project = await Project.create({
      _id: crypto.randomUUID(),
      title,
      description: description || "",
      budget: Number(budget || 0),
      category: category || "",
      client_id: req.user._id,
      status: "open",
      payment_status: "not_deposited",
    });

    return res.status(201).json(project.toJSON());
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to create project." });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found." });
    }

    if (req.user.role !== "admin" && project.client_id !== req.user._id) {
      return res.status(403).json({ error: "Not authorized to update this project." });
    }

    const allowedFields = {
      title: req.body.title,
      description: req.body.description,
      budget: req.body.budget !== undefined ? Number(req.body.budget) : undefined,
      category: req.body.category,
      status: req.body.status,
      payment_status: req.body.payment_status,
    };

    Object.entries(allowedFields).forEach(([key, value]) => {
      if (value !== undefined) {
        project[key] = value;
      }
    });

    await project.save();
    return res.status(200).json(project.toJSON());
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to update project." });
  }
};

exports.countBidsForProject = async (projectId) => {
  return Bid.countDocuments({ project_id: projectId });
};
