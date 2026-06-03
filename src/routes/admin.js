const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");

router.get("/users", adminController.getUsers);
router.patch("/users/:id/role", adminController.changeRole);
router.patch("/users/:id/status", adminController.toggleUserStatus);

router.get("/companies", adminController.getCompanies);
router.patch("/companies/:id/status", adminController.updateCompanyStatus);

router.get("/jobs", adminController.getJobs);
router.delete("/jobs/:id", adminController.deleteJob);

router.get("/analytics", adminController.getPlatformAnalytics);
router.get("/payments", adminController.getPayments);

module.exports = router;
