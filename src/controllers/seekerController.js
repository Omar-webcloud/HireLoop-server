const { getDb } = require("../config/db");
const { ObjectId } = require("mongodb");

// Get seeker profile
async function getProfile(req, res) {
  try {
    const db = getDb();
    const userId = req.headers["x-user-id"];
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const query = ObjectId.isValid(userId) ? { _id: new ObjectId(userId) } : { id: userId };
    const user = await db.collection("user").findOne(query);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Ensure profile sub-document exists
    const profile = user.profile || { skills: [], contact: "", resumeUrl: "" };
    res.json({ name: user.name, email: user.email, role: user.role, profile, subscriptionPlan: user.subscriptionPlan || "free" });
  } catch (error) {
    console.error("Error fetching seeker profile:", error);
    res.status(500).json({ error: "Server error" });
  }
}

// Update seeker profile (skills, contact details, resume URL)
async function updateProfile(req, res) {
  try {
    const db = getDb();
    const userId = req.headers["x-user-id"];
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { skills, contact, resumeUrl } = req.body;
    const query = ObjectId.isValid(userId) ? { _id: new ObjectId(userId) } : { id: userId };
    
    await db.collection("user").updateOne(query, {
      $set: {
        profile: {
          skills: Array.isArray(skills) ? skills : (skills ? skills.split(",").map(s => s.trim()) : []),
          contact: contact || "",
          resumeUrl: resumeUrl || ""
        }
      }
    });

    res.json({ success: true, message: "Profile updated successfully" });
  } catch (error) {
    console.error("Error updating seeker profile:", error);
    res.status(500).json({ error: "Server error" });
  }
}

// Save job
async function saveJob(req, res) {
  try {
    const db = getDb();
    const userId = req.headers["x-user-id"];
    const { jobId } = req.body;
    if (!userId || !jobId) return res.status(400).json({ error: "Missing fields" });

    const exist = await db.collection("saved_jobs").findOne({ userId, jobId });
    if (exist) return res.json({ success: true, message: "Job already saved" });

    await db.collection("saved_jobs").insertOne({
      userId,
      jobId,
      createdAt: new Date().toISOString()
    });

    res.json({ success: true, message: "Job saved successfully" });
  } catch (error) {
    console.error("Error saving job:", error);
    res.status(500).json({ error: "Server error" });
  }
}

// Unsave job
async function unsaveJob(req, res) {
  try {
    const db = getDb();
    const userId = req.headers["x-user-id"];
    const { id: jobId } = req.params;
    if (!userId || !jobId) return res.status(400).json({ error: "Missing fields" });

    await db.collection("saved_jobs").deleteOne({ userId, jobId });
    res.json({ success: true, message: "Job removed from saved list" });
  } catch (error) {
    console.error("Error unsaving job:", error);
    res.status(500).json({ error: "Server error" });
  }
}

// Get saved jobs
async function getSavedJobs(req, res) {
  try {
    const db = getDb();
    const userId = req.headers["x-user-id"];
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const saved = await db.collection("saved_jobs").find({ userId }).toArray();
    const jobIds = saved.map(s => ObjectId.isValid(s.jobId) ? new ObjectId(s.jobId) : s.jobId);
    
    // Find matching jobs
    const jobs = await db.collection("jobs").find({
      $or: [
        { _id: { $in: jobIds.filter(id => id instanceof ObjectId) } },
        { id: { $in: saved.map(s => s.jobId) } }
      ]
    }).toArray();

    res.json(jobs.map(j => ({ ...j, id: j._id.toString(), _id: undefined })));
  } catch (error) {
    console.error("Error fetching saved jobs:", error);
    res.status(500).json({ error: "Server error" });
  }
}

// Apply to a job
async function applyJob(req, res) {
  try {
    const db = getDb();
    const userId = req.headers["x-user-id"];
    const userRole = req.headers["x-user-role"];
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { jobId, coverLetter, resumeUrl } = req.body;
    if (!jobId) return res.status(400).json({ error: "Job ID is required" });

    // Validate if the user is a seeker
    const userQuery = ObjectId.isValid(userId) ? { _id: new ObjectId(userId) } : { id: userId };
    const user = await db.collection("user").findOne(userQuery);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Require Pro or Enterprise plan to apply
    const plan = user.subscriptionPlan || "free";
    if (plan === "free") {
      return res.status(403).json({ error: "Upgrade required. Applying to jobs requires a Pro or Enterprise plan." });
    }

    const exist = await db.collection("applications").findOne({ jobId, seekerId: userId });
    if (exist) return res.status(400).json({ error: "You have already applied to this job." });

    await db.collection("applications").insertOne({
      jobId,
      seekerId: userId,
      seekerName: user.name,
      seekerEmail: user.email,
      status: "applied", // applied, reviewing, accepted, rejected
      coverLetter: coverLetter || "",
      resumeUrl: resumeUrl || user.profile?.resumeUrl || "",
      appliedAt: new Date().toISOString()
    });

    res.json({ success: true, message: "Application submitted successfully" });
  } catch (error) {
    console.error("Error applying to job:", error);
    res.status(500).json({ error: "Server error" });
  }
}

// Get submitted applications status
async function getApplications(req, res) {
  try {
    const db = getDb();
    const userId = req.headers["x-user-id"];
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const applications = await db.collection("applications").find({ seekerId: userId }).sort({ appliedAt: -1 }).toArray();
    
    // Enrich with job info
    const enrichedApps = [];
    for (const app of applications) {
      let job = null;
      if (ObjectId.isValid(app.jobId)) {
        job = await db.collection("jobs").findOne({ _id: new ObjectId(app.jobId) });
      } else {
        job = await db.collection("jobs").findOne({ id: app.jobId });
      }
      enrichedApps.push({
        id: app._id.toString(),
        jobId: app.jobId,
        jobTitle: job ? job.title : "Unknown Job",
        companyName: job ? job.company : "Unknown Company",
        status: app.status,
        appliedAt: app.appliedAt,
        coverLetter: app.coverLetter,
        resumeUrl: app.resumeUrl
      });
    }

    res.json(enrichedApps);
  } catch (error) {
    console.error("Error fetching seeker applications:", error);
    res.status(500).json({ error: "Server error" });
  }
}

// Upgrade subscription (Mocks a payment and creates billing record)
async function upgradeSubscription(req, res) {
  try {
    const db = getDb();
    const userId = req.headers["x-user-id"];
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { plan } = req.body; // 'pro' or 'enterprise'
    if (!["pro", "enterprise"].includes(plan)) {
      return res.status(400).json({ error: "Invalid subscription plan selection." });
    }

    const price = plan === "pro" ? 29.00 : 99.00;
    const query = ObjectId.isValid(userId) ? { _id: new ObjectId(userId) } : { id: userId };
    const user = await db.collection("user").findOne(query);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Update user plan
    await db.collection("user").updateOne(query, { $set: { subscriptionPlan: plan } });

    // Record the payment
    const paymentRecord = {
      userId,
      email: user.email,
      plan: plan.charAt(0).toUpperCase() + plan.slice(1),
      amount: `$${price.toFixed(2)}`,
      status: "completed",
      transactionId: `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      createdAt: new Date().toISOString()
    };
    await db.collection("payments").insertOne(paymentRecord);

    res.json({ success: true, message: `Successfully upgraded to ${plan} plan!` });
  } catch (error) {
    console.error("Error upgrading subscription:", error);
    res.status(500).json({ error: "Server error" });
  }
}

module.exports = {
  getProfile,
  updateProfile,
  saveJob,
  unsaveJob,
  getSavedJobs,
  applyJob,
  getApplications,
  upgradeSubscription
};
