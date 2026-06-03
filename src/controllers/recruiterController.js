const { getDb } = require("../config/db");
const { ObjectId } = require("mongodb");

// Register a company profile
async function registerCompany(req, res) {
  try {
    const db = getDb();
    const userId = req.headers["x-user-id"];
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { name, industry, location, employees, description, logo } = req.body;
    if (!name) return res.status(400).json({ error: "Company name is required" });

    // Check if user already owns a company
    const exist = await db.collection("companies").findOne({ ownerId: userId });
    if (exist) {
      return res.status(400).json({ error: "You have already registered a company." });
    }

    const company = {
      name,
      industry: industry || "",
      location: location || "",
      employees: employees || "1-10",
      description: description || "",
      logo: logo || null,
      ownerId: userId,
      status: "pending", // pending, approved, rejected
      createdAt: new Date().toISOString()
    };

    const result = await db.collection("companies").insertOne(company);
    res.json({ success: true, companyId: result.insertedId.toString(), message: "Company profile submitted for review." });
  } catch (error) {
    console.error("Error registering company:", error);
    res.status(500).json({ error: "Server error" });
  }
}

// Get recruiter's company profile
async function getMyCompany(req, res) {
  try {
    const db = getDb();
    const userId = req.headers["x-user-id"];
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const company = await db.collection("companies").findOne({ ownerId: userId });
    if (!company) return res.status(404).json({ error: "No company registered yet." });

    res.json({ ...company, id: company._id.toString(), _id: undefined });
  } catch (error) {
    console.error("Error getting recruiter company:", error);
    res.status(500).json({ error: "Server error" });
  }
}

// Update recruiter's company profile
async function updateMyCompany(req, res) {
  try {
    const db = getDb();
    const userId = req.headers["x-user-id"];
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { name, industry, location, employees, description, logo } = req.body;
    
    const result = await db.collection("companies").updateOne(
      { ownerId: userId },
      {
        $set: {
          name,
          industry,
          location,
          employees,
          description,
          logo: logo || null,
          updatedAt: new Date().toISOString()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "No company registered yet." });
    }

    res.json({ success: true, message: "Company profile updated." });
  } catch (error) {
    console.error("Error updating recruiter company:", error);
    res.status(500).json({ error: "Server error" });
  }
}

// Post a new job listing
async function postJob(req, res) {
  try {
    const db = getDb();
    const userId = req.headers["x-user-id"];
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // Verify company registration and approval
    const company = await db.collection("companies").findOne({ ownerId: userId });
    if (!company) {
      return res.status(400).json({ error: "You must register a company first." });
    }
    if (company.status !== "approved") {
      return res.status(403).json({ error: `Your company status is '${company.status}'. It must be 'approved' to post jobs.` });
    }

    const { title, location, type, salaryMin, salaryMax, currency, category, description, requirements, responsibilities } = req.body;
    if (!title) return res.status(400).json({ error: "Job title is required." });

    const job = {
      title,
      company: company.name,
      companyId: company._id.toString(),
      location: location || "Remote",
      type: type || "Full-time",
      salaryMin: Number(salaryMin) || 0,
      salaryMax: Number(salaryMax) || 0,
      currency: currency || "USD",
      category: category || "Engineering",
      description: description || "",
      requirements: requirements || "",
      responsibilities: responsibilities || "",
      ownerId: userId,
      createdAt: new Date().toISOString()
    };

    const result = await db.collection("jobs").insertOne(job);
    res.json({ success: true, jobId: result.insertedId.toString(), message: "Job posted successfully!" });
  } catch (error) {
    console.error("Error posting job:", error);
    res.status(500).json({ error: "Server error" });
  }
}

// Edit a job listing
async function editJob(req, res) {
  try {
    const db = getDb();
    const userId = req.headers["x-user-id"];
    const jobId = req.params.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { title, location, type, salaryMin, salaryMax, currency, category, description, requirements, responsibilities } = req.body;
    
    const query = ObjectId.isValid(jobId) ? { _id: new ObjectId(jobId), ownerId: userId } : { id: jobId, ownerId: userId };
    const result = await db.collection("jobs").updateOne(query, {
      $set: {
        title,
        location,
        type,
        salaryMin: Number(salaryMin) || 0,
        salaryMax: Number(salaryMax) || 0,
        currency,
        category,
        description,
        requirements,
        responsibilities,
        updatedAt: new Date().toISOString()
      }
    });

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Job not found or unauthorized." });
    }

    res.json({ success: true, message: "Job listing updated." });
  } catch (error) {
    console.error("Error updating job:", error);
    res.status(500).json({ error: "Server error" });
  }
}

// Remove a job listing
async function removeJob(req, res) {
  try {
    const db = getDb();
    const userId = req.headers["x-user-id"];
    const jobId = req.params.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const query = ObjectId.isValid(jobId) ? { _id: new ObjectId(jobId), ownerId: userId } : { id: jobId, ownerId: userId };
    const result = await db.collection("jobs").deleteOne(query);

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Job not found or unauthorized." });
    }

    res.json({ success: true, message: "Job listing removed." });
  } catch (error) {
    console.error("Error removing job:", error);
    res.status(500).json({ error: "Server error" });
  }
}

// Get incoming applications for recruiter's jobs
async function getIncomingApplications(req, res) {
  try {
    const db = getDb();
    const userId = req.headers["x-user-id"];
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // Find jobs owned by this recruiter
    const jobs = await db.collection("jobs").find({ ownerId: userId }).toArray();
    const jobIds = jobs.map(j => j._id.toString());

    // Get applications matching these jobs
    const applications = await db.collection("applications").find({
      jobId: { $in: jobIds }
    }).sort({ appliedAt: -1 }).toArray();

    // Map job title onto applications for convenience
    const jobMap = {};
    jobs.forEach(j => { jobMap[j._id.toString()] = j.title; });

    const mapped = applications.map(app => ({
      id: app._id.toString(),
      jobId: app.jobId,
      jobTitle: jobMap[app.jobId] || "Unknown Position",
      seekerId: app.seekerId,
      seekerName: app.seekerName,
      seekerEmail: app.seekerEmail,
      status: app.status,
      coverLetter: app.coverLetter,
      resumeUrl: app.resumeUrl,
      appliedAt: app.appliedAt
    }));

    res.json(mapped);
  } catch (error) {
    console.error("Error fetching incoming applications:", error);
    res.status(500).json({ error: "Server error" });
  }
}

// Manage applicant status (accept/reject)
async function updateApplicationStatus(req, res) {
  try {
    const db = getDb();
    const userId = req.headers["x-user-id"];
    const appId = req.params.id;
    const { status } = req.body; // reviewing, accepted, rejected
    
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!["applied", "reviewing", "accepted", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value." });
    }

    const appQuery = ObjectId.isValid(appId) ? { _id: new ObjectId(appId) } : { id: appId };
    const application = await db.collection("applications").findOne(appQuery);
    if (!application) {
      return res.status(404).json({ error: "Application not found." });
    }

    // Verify recruiter owns the job associated with application
    const jobQuery = ObjectId.isValid(application.jobId) ? { _id: new ObjectId(application.jobId) } : { id: application.jobId };
    const job = await db.collection("jobs").findOne(jobQuery);
    if (!job || job.ownerId !== userId) {
      return res.status(403).json({ error: "Unauthorized to update this application status." });
    }

    await db.collection("applications").updateOne(appQuery, {
      $set: { status, updatedAt: new Date().toISOString() }
    });

    res.json({ success: true, message: `Application status updated to '${status}'.` });
  } catch (error) {
    console.error("Error updating application status:", error);
    res.status(500).json({ error: "Server error" });
  }
}

// View recruiter analytics (performance and activity)
async function getRecruiterAnalytics(req, res) {
  try {
    const db = getDb();
    const userId = req.headers["x-user-id"];
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // Get jobs counts
    const jobs = await db.collection("jobs").find({ ownerId: userId }).toArray();
    const jobIds = jobs.map(j => j._id.toString());
    const totalJobs = jobs.length;

    // Get application count
    const totalApplications = await db.collection("applications").countDocuments({
      jobId: { $in: jobIds }
    });

    // Breakdown of applications by status
    const accepted = await db.collection("applications").countDocuments({ jobId: { $in: jobIds }, status: "accepted" });
    const rejected = await db.collection("applications").countDocuments({ jobId: { $in: jobIds }, status: "rejected" });
    const pending = totalApplications - (accepted + rejected);

    res.json({
      totalJobs,
      totalApplications,
      statusBreakdown: { accepted, rejected, pending }
    });
  } catch (error) {
    console.error("Error fetching recruiter analytics:", error);
    res.status(500).json({ error: "Server error" });
  }
}

module.exports = {
  registerCompany,
  getMyCompany,
  updateMyCompany,
  postJob,
  editJob,
  removeJob,
  getIncomingApplications,
  updateApplicationStatus,
  getRecruiterAnalytics
};
