// routes/userRoutes.js

import express from "express";
import userController from "../controllers/userController.js";

const router = express.Router();

// Define a POST route for user registration
router.post("/register", userController.registerUser);

// Define a POST route for user login
router.post("/login", userController.loginUser);

export default router;
