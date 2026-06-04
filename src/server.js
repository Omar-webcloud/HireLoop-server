// /HireLoop-server/src/server.js
require('dotenv').config();
const express = require('express');
const { connectDb } = require('./config/db');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  credentials: true
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