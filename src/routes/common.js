const express = require("express");
const router = express.Router();
const commonController = require("../controllers/commonController");

router.get("/jobs", commonController.getJobs);
router.get("/jobs/:id", commonController.getJobById);
router.get("/companies", commonController.getCompanies);

module.exports = router;
