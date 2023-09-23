// config.js

// Load environment variables from .env file if it exists
import dotenv from "dotenv";
dotenv.config();

const config = {
  // Express server configuration
  PORT: process.env.PORT || 3000,
  // MongoDB configuration
  MONGO_URI: process.env.MONGO_URI,
};

export default config;
