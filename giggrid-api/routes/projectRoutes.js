const express = require("express");
const {
  getAllProjects,
  getOpenProjects,
  getClientProjects,
  getProjectsByIds,
  createProject,
  updateProject,
} = require("../controllers/projectController");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

router.get("/", protect, adminOnly, getAllProjects);
router.get("/open", protect, getOpenProjects);
router.get("/by-ids", protect, getProjectsByIds);
router.get("/client/:clientId", protect, getClientProjects);
router.post("/", protect, createProject);
router.put("/:id", protect, updateProject);

module.exports = router;
