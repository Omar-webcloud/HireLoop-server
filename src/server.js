require('dotenv').config();
const express = require('express');
const { connectDb } = require('./config/db');
const cors = require('cors');

const app = express();

// ✅ Fixed: CORS origin should be the frontend URL, not the backend's own URL
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'https://hireloop-jobs.vercel.app',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server / curl)
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
}));

app.use(express.json());

// Routes
app.use('/api/seeker', require('./routes/seeker'));
app.use('/api/recruiter', require('./routes/recruiter'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/common', require('./routes/common'));

// Connect DB and start server
connectDb().then(() => {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

module.exports = app;