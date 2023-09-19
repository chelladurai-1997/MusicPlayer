import mongoose from "mongoose";

// Define the liked song schema
const likedSongSchema = new mongoose.Schema(
  {
    song: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Song", // Reference the Song model
      required: true,
    },
    // You can add more fields specific to liked songs if needed
  },
  {
    timestamps: true,
  }
);

// Define the user schema (as previously defined)
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$/.test(v);
        },
        message: "Please enter a valid email address",
      },
    },
    password: {
      type: String,
      required: true,
    },
    likedSongs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LikedSong",
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Create a LikedSong model using the liked song schema
const LikedSong = mongoose.model("LikedSong", likedSongSchema);

// Create a User model using the user schema
const User = mongoose.model("User", userSchema);

export { User, LikedSong };
