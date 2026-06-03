const { getDb } = require("../config/db");
const { ObjectId } = require("mongodb");

// Get all users
async function getUsers(req, res) {
  try {
    const db = getDb();
    const { role, search } = req.query;

    const query = {};
    if (role && role !== "All") {
      query.role = role;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }

    const users = await db.collection("user").find(query).sort({ createdAt: -1 }).toArray();
    
    res.json(users.map(u => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role || "seeker",
      createdAt: u.createdAt,
      suspended: u.suspended || false
    })));
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Server error" });
  }
}

// Change user role
async function changeRole(req, res) {
  try {
    const db = getDb();
    const userId = req.params.id;
    const { role } = req.body;

    if (!["seeker", "recruiter", "admin"].includes(role)) {
      return res.status(400).json({ error: "Invalid role value" });
    }

    const query = ObjectId.isValid(userId) ? { _id: new ObjectId(userId) } : { id: userId };
    const result = await db.collection("user").updateOne(
      { $or: [ { _id: ObjectId.isValid(userId) ? new ObjectId(userId) : null }, { id: userId } ] },
      { $set: { role } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ success: true, message: `User role updated to ${role}` });
  } catch (error) {
    console.error("Error changing user role:", error);
    res.status(500).json({ error: "Server error" });
  }
}

// Toggle user status (Suspend/Activate)
async function toggleUserStatus(req, res) {
  try {
    const db = getDb();
    const userId = req.params.id;
    const { suspended } = req.body;

    const result = await db.collection("user").updateOne(
      { $or: [ { _id: ObjectId.isValid(userId) ? new ObjectId(userId) : null }, { id: userId } ] },
      { $set: { suspended: !!suspended } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ success: true, message: suspended ? "User suspended successfully" : "User activated successfully" });
  } catch (error) {
    console.error("Error toggling user status:", error);
    res.status(500).json({ error: "Server error" });
  }
}

// View all registered company profiles (for moderation/approvals)
async function getCompanies(req, res) {
  try {
    const db = getDb();
    const companies = await db.collection("companies").find({}).sort({ createdAt: -1 }).toArray();
    res.json(companies.map(c => ({ ...c, id: c._id.toString(), _id: undefined })));
  } catch (error) {
    console.error("Error fetching companies:", error);
    res.status(500).json({ error: "Server error" });
  }
}

// Approve or reject company registration
async function updateCompanyStatus(req, res) {
  try {
    const db = getDb();
    const companyId = req.params.id;
    const { status } = req.body; // approved, rejected, pending

    if (!["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const query = ObjectId.isValid(companyId) ? { _id: new ObjectId(companyId) } : { id: companyId };
    const result = await db.collection("companies").updateOne(query, {
      $set: { status }
    });

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Company not found" });
    }

    res.json({ success: true, message: `Company status updated to ${status}` });
  } catch (error) {
    console.error("Error updating company status:", error);
    res.status(500).json({ error: "Server error" });
  }
}

// View all job posts (for moderation)
async function getJobs(req, res) {
  try {
    const db = getDb();
    const jobs = await db.collection("jobs").find({}).sort({ createdAt: -1 }).toArray();
    res.json(jobs.map(j => ({ ...j, id: j._id.toString(), _id: undefined })));
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({ error: "Server error" });
  }
}

// Moderate/remove job listing
async function deleteJob(req, res) {
  try {
    const db = getDb();
    const jobId = req.params.id;

    const query = ObjectId.isValid(jobId) ? { _id: new ObjectId(jobId) } : { id: jobId };
    const result = await db.collection("jobs").deleteOne(query);

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Job listing not found" });
    }

    res.json({ success: true, message: "Job moderated and deleted successfully" });
  } catch (error) {
    console.error("Error deleting job:", error);
    res.status(500).json({ error: "Server error" });
  }
}

// Get platform-wide analytics
async function getPlatformAnalytics(req, res) {
  try {
    const db = getDb();

    // Counts
    const totalUsers = await db.collection("user").countDocuments({});
    const totalSeekers = await db.collection("user").countDocuments({ role: "seeker" });
    const totalRecruiters = await db.collection("user").countDocuments({ role: "recruiter" });
    const totalCompanies = await db.collection("companies").countDocuments({});
    const totalJobs = await db.collection("jobs").countDocuments({});

    // Platform Revenue (Sum up billing logs)
    const payments = await db.collection("payments").find({}).toArray();
    let totalRevenue = 0;
    payments.forEach(p => {
      // Remove $ and parse float
      const val = parseFloat(p.amount.replace(/[^0-9.]/g, "")) || 0;
      totalRevenue += val;
    });

    res.json({
      totalUsers,
      totalSeekers,
      totalRecruiters,
      totalCompanies,
      totalJobs,
      totalRevenue: `$${totalRevenue.toLocaleString()}`
    });
  } catch (error) {
    console.error("Error fetching admin analytics:", error);
    res.status(500).json({ error: "Server error" });
  }
}

// View all payment subscription records
async function getPayments(req, res) {
  try {
    const db = getDb();
    const payments = await db.collection("payments").find({}).sort({ createdAt: -1 }).toArray();
    res.json(payments.map(p => ({ ...p, id: p._id.toString(), _id: undefined })));
  } catch (error) {
    console.error("Error fetching payment records:", error);
    res.status(500).json({ error: "Server error" });
  }
}

module.exports = {
  getUsers,
  changeRole,
  toggleUserStatus,
  getCompanies,
  updateCompanyStatus,
  getJobs,
  deleteJob,
  getPlatformAnalytics,
  getPayments
};
