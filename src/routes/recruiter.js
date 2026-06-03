const express = require("express");
const router = express.Router();
const recruiterController = require("../controllers/recruiterController");

router.post("/companies", recruiterController.registerCompany);
router.get("/companies/my", recruiterController.getMyCompany);
router.put("/companies/my", recruiterController.updateMyCompany);

router.post("/jobs", recruiterController.postJob);
router.put("/jobs/:id", recruiterController.editJob);
router.delete("/jobs/:id", recruiterController.removeJob);

router.get("/applications", recruiterController.getIncomingApplications);
router.patch("/applications/:id/status", recruiterController.updateApplicationStatus);

router.get("/analytics", recruiterController.getRecruiterAnalytics);

module.exports = router;
