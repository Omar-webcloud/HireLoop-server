const express = require("express");
const router = express.Router();
const seekerController = require("../controllers/seekerController");

router.get("/profile", seekerController.getProfile);
router.put("/profile", seekerController.updateProfile);

router.post("/saved-jobs", seekerController.saveJob);
router.delete("/saved-jobs/:id", seekerController.unsaveJob);
router.get("/saved-jobs", seekerController.getSavedJobs);

router.post("/apply", seekerController.applyJob);
router.get("/applications", seekerController.getApplications);
router.post("/subscribe", seekerController.upgradeSubscription);

module.exports = router;
