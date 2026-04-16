const crypto = require("crypto");
const Bid = require("../models/Bid");
const Project = require("../models/Project");
const User = require("../models/User");

async function attachBidUsers(bids) {
  const freelancerIds = [...new Set(bids.map((bid) => bid.freelancer_id).filter(Boolean))];
  const users = await User.find({ _id: { $in: freelancerIds } }).select("full_name email");
  const userMap = new Map(users.map((user) => [user._id, user]));

  return bids.map((bid) => {
    const mapped = bid.toJSON();
    const user = userMap.get(bid.freelancer_id);
    mapped.users = user
      ? {
          full_name: user.full_name,
          email: user.email,
        }
      : null;
    return mapped;
  });
}

exports.getAllBids = async (_req, res) => {
  try {
    const bids = await Bid.find().sort({ created_at: -1 });
    return res.status(200).json(bids.map((bid) => bid.toJSON()));
  } catch (_error) {
    return res.status(500).json({ error: "Failed to fetch bids." });
  }
};

exports.getBidsByProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found." });
    }

    if (req.user.role !== "admin" && project.client_id !== req.user._id) {
      return res.status(403).json({ error: "Not authorized to view these bids." });
    }

    const bids = await Bid.find({ project_id: req.params.projectId }).sort({ created_at: -1 });
    return res.status(200).json(await attachBidUsers(bids));
  } catch (_error) {
    return res.status(500).json({ error: "Failed to fetch project bids." });
  }
};

exports.getBidsByFreelancer = async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user._id !== req.params.freelancerId) {
      return res.status(403).json({ error: "Not authorized to view these bids." });
    }

    const bids = await Bid.find({ freelancer_id: req.params.freelancerId }).sort({ created_at: -1 });
    return res.status(200).json(bids.map((bid) => bid.toJSON()));
  } catch (_error) {
    return res.status(500).json({ error: "Failed to fetch freelancer bids." });
  }
};

exports.createBid = async (req, res) => {
  try {
    const { project_id, bid_amount, proposal } = req.body;
    const project = await Project.findById(project_id);

    if (!project || project.status !== "open") {
      return res.status(400).json({ error: "Project is not open for bidding." });
    }

    const existingBid = await Bid.findOne({ project_id, freelancer_id: req.user._id });
    if (existingBid) {
      return res.status(409).json({ error: "You have already submitted a bid for this project." });
    }

    const bid = await Bid.create({
      _id: crypto.randomUUID(),
      project_id,
      freelancer_id: req.user._id,
      bid_amount: Number(bid_amount),
      proposal: proposal || "",
      status: "pending",
    });

    return res.status(201).json(bid.toJSON());
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to create bid." });
  }
};

exports.updateBid = async (req, res) => {
  try {
    const bid = await Bid.findById(req.params.id);
    if (!bid) {
      return res.status(404).json({ error: "Bid not found." });
    }

    const project = await Project.findById(bid.project_id);
    const canAdminister = req.user.role === "admin" || project?.client_id === req.user._id;
    const isOwner = bid.freelancer_id === req.user._id;

    if (!canAdminister && !isOwner) {
      return res.status(403).json({ error: "Not authorized to update this bid." });
    }

    if (req.body.bid_amount !== undefined && isOwner) {
      bid.bid_amount = Number(req.body.bid_amount);
    }
    if (req.body.proposal !== undefined && isOwner) {
      bid.proposal = req.body.proposal;
    }
    if (req.body.status !== undefined && canAdminister) {
      bid.status = req.body.status;
    }

    await bid.save();
    return res.status(200).json(bid.toJSON());
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to update bid." });
  }
};

exports.rejectOtherBids = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found." });
    }

    if (req.user.role !== "admin" && project.client_id !== req.user._id) {
      return res.status(403).json({ error: "Not authorized to update bids for this project." });
    }

    await Bid.updateMany(
      { project_id: req.params.projectId, _id: { $ne: req.params.keepBidId } },
      { $set: { status: "rejected" } },
    );

    return res.status(200).json({ success: true });
  } catch (_error) {
    return res.status(500).json({ error: "Failed to reject other bids." });
  }
};

exports.rejectAllBidsForProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found." });
    }

    if (req.user.role !== "admin" && project.client_id !== req.user._id) {
      return res.status(403).json({ error: "Not authorized to update bids for this project." });
    }

    await Bid.updateMany({ project_id: req.params.projectId }, { $set: { status: "rejected" } });
    return res.status(200).json({ success: true });
  } catch (_error) {
    return res.status(500).json({ error: "Failed to reject bids." });
  }
};
