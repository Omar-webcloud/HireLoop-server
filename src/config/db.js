const { MongoClient } = require("mongodb");
require("dotenv").config();

const uri = process.env.MONGO_DB_URI;
if (!uri) {
  throw new Error("Missing MONGO_DB_URI in environment variables");
}

let client = null;
let db = null;

async function connectDb() {
  if (db) return db;
  try {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db(process.env.AUTH_DB_NAME || "hireloop");
    console.log("Connected to MongoDB successfully");
    return db;
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw error;
  }
}

function getDb() {
  if (!db) {
    throw new Error("Database not initialized. Call connectDb first.");
  }
  return db;
}

module.exports = {
  connectDb,
  getDb
};
