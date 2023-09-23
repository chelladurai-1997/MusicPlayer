// app.js

import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import userRoutes from "./routes/userRoutes.js"; // Import user routes
import songRoutes from "./routes/songRoutes.js"; // Import user routes
import config from "./config.js";
import errorHandler from "./middleware/globalErrorHandler.js";

const app = express();
const router = express.Router();

// Middleware to parse JSON data in the request body
app.use(bodyParser.json());

// MongoDB connection setup
mongoose.connect(config.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const connection = mongoose.connection;

connection.on("connected", () => {
  console.log("MongoDB connected successfully");
  app.listen(config.PORT, () => {
    console.log(`app listening on port ${config.PORT}`);
  });
});

connection.on("error", (err) => {
  console.log(
    "MongoDB connection error. Please make sure MongoDB is running. " + err
  );
  process.exit(1); // Exit the application on MongoDB connection error
});

// Mount the song routes at /api/songs
app.use("/api/songs", songRoutes);

// Mount the user routes at /api/users
app.use("/api/users", userRoutes);

// Handles error at global level
app.use(errorHandler);

export default app;
