const express = require("express");
const {
  getAllBids,
  getBidsByProject,
  getBidsByFreelancer,
  createBid,
  updateBid,
  rejectOtherBids,
  rejectAllBidsForProject,
} = require("../controllers/bidController");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

router.get("/", protect, adminOnly, getAllBids);
router.get("/project/:projectId", protect, getBidsByProject);
router.get("/freelancer/:freelancerId", protect, getBidsByFreelancer);
router.post("/", protect, createBid);
router.put("/:id", protect, updateBid);
router.put("/project/:projectId/reject-others/:keepBidId", protect, rejectOtherBids);
router.put("/project/:projectId/reject-all", protect, rejectAllBidsForProject);

module.exports = router;
