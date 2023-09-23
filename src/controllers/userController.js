// userController.js
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import User from "../models/User.js";
import userService from "../services/userService.js";

const JWT_SECRET = "your-secret-key"; // Replace with a strong secret key, and consider storing it in an environment variable.
const JWT_EXPIRES_IN = "1d"; // JWT expiration time (e.g., 1 day).

const registerUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check if the email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists!" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUser = new User({ email, password: hashedPassword });
    await newUser.save();

    // Generate a JWT token for the newly registered user
    const token = jwt.sign({ userId: newUser._id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    // Respond with the JWT token
    res.status(201).json({
      message: "Registration was successful",
      userId: newUser._id,
      token,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      // Mongoose validation error occurred
      const validationErrors = {};

      // Extract error messages for each field
      for (const field in error.errors) {
        validationErrors[field] = error.errors[field].message;
      }

      return res.status(400).json({ errors: validationErrors });
    }

    next();
  }
};

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find the user by email
    const user = await User.findOne({ email });

    // Check if the user exists
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password!" });
    }

    // Compare the provided password with the hashed password
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid email or password!" });
    }

    // Generate a JWT token for the logged-in user
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    // Respond with the JWT token
    res.json({ token, userId: user._id });
  } catch (error) {
    next(error);
  }
};

export default {
  registerUser,
  loginUser,
};
