const express = require("express");
const cors = require("cors");
const { connectDb } = require("./config/db");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
  credentials: true
}));
app.use(express.json());

// Routes
app.use("/api", require("./routes/common"));
app.use("/api/seeker", require("./routes/seeker"));
app.use("/api/recruiter", require("./routes/recruiter"));
app.use("/api/admin", require("./routes/admin"));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Something went wrong!" });
});

// Connect DB & Start Server
connectDb().then(() => {
  app.listen(PORT, () => {
    console.log(`HireLoop server listening at http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error("Database connection failed. Exiting server...", err);
  process.exit(1);
});
