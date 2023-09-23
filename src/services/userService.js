// userService.js

import User from "../models/User.js";

const createUser = async (email, password) => {
  // Create a new user using the User model
  const newUser = new User({
    email,
    password,
  });

  // Save the user to the database using await
  return await newUser.save();
};

export default {
  createUser,
};
