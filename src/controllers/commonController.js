const { getDb } = require("../config/db");
const { ObjectId } = require("mongodb");

// Browse jobs with advanced filters
async function getJobs(req, res) {
  try {
    const db = getDb();
    const { category, type, location, minSalary, search } = req.query;

    const query = {};

    if (category && category !== "All") {
      query.category = category;
    }
    if (type && type !== "All") {
      query.type = type;
    }
    if (location && location !== "All") {
      query.location = { $regex: location, $options: "i" };
    }
    if (minSalary) {
      query.salaryMax = { $gte: Number(minSalary) };
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { company: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    const jobs = await db.collection("jobs").find(query).sort({ createdAt: -1 }).toArray();
    res.json(jobs.map(j => ({ ...j, id: j._id.toString(), _id: undefined })));
  } catch (error) {
    console.error("Error fetching jobs:", {
      message: error?.message,
      stack: error?.stack,
      query: req?.query
    });
    res.status(500).json({
      error: "Server error",
      details: error?.message || ""
    });
  }

}

// Get single job details by ID
async function getJobById(req, res) {
  try {
    const db = getDb();
    const jobId = req.params.id;

    const query = ObjectId.isValid(jobId) ? { _id: new ObjectId(jobId) } : { id: jobId };
    const job = await db.collection("jobs").findOne(query);

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json({ ...job, id: job._id.toString(), _id: undefined });
  } catch (error) {
    console.error("Error fetching job details:", error);
    res.status(500).json({ error: "Server error" });
  }
}

// Get all approved companies
async function getCompanies(req, res) {
  try {
    const db = getDb();
    const companies = await db.collection("companies").find({ status: "approved" }).sort({ createdAt: -1 }).toArray();
    res.json(companies.map(c => ({ ...c, id: c._id.toString(), _id: undefined })));
  } catch (error) {
    console.error("Error fetching approved companies:", error);
    res.status(500).json({ error: "Server error" });
  }
}

module.exports = {
  getJobs,
  getJobById,
  getCompanies
};
