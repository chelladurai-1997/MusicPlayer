// controllers/songController.js

import Song from "../models/Song.js";
import LikedSong from "../models/LikedSong.js";
import User from "../models/User.js";
import { getSongsSerive } from "../services/songService.js";

// Define a route for retrieving songs with pagination
export const getSongs = async (req, res) => {
  try {
    const { page, limit, keyword } = req.query; // Get the page and limit from the request query parameters

    // Call the getSongs function to retrieve songs with pagination
    const result = await getSongsSerive(
      parseInt(page ?? 1),
      parseInt(limit ?? 10),
      keyword
    );

    // Send the paginated results as a JSON response
    res.status(200).json(result);
  } catch (error) {
    // Handle any errors that occur during the retrieval
    res.status(500).json({ error: "Internal server error" });
  }
};

// Controller function to add a song to a user's liked songs
export const addLikedSong = async (req, res) => {
  try {
    const { userId } = req.params;
    const { songId } = req.body;

    // Check if the user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the song exists
    const song = await Song.findById(songId);
    if (!song) {
      return res.status(404).json({ message: "Song not found" });
    }

    // Create a new LikedSong and associate it with the user
    const likedSong = new LikedSong({ song: songId });
    user.likedSongs.push(likedSong);

    // Save the user and the liked song
    await user.save();
    await likedSong.save();

    return res.status(201).json({ message: "Song added to liked songs" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Controller function to retrieve all liked songs for a user
export const getLikedSongs = async (req, res) => {
  const { userId } = req.params;

  try {
    // Check if the user exists and populate their liked songs
    const user = await User.findById(userId).populate({
      path: "likedSongs",
      populate: {
        path: "song", // Populates the 'song' field within 'likedSongs'
        model: "Song",
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const likedSongs = user.likedSongs;

    return res.status(200).json({ likedSongs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Controller function to remove a liked song for a user based on songId
export const removeLikedSong = async (req, res) => {
  const { userId, songId } = req.params;

  try {
    // Check if the user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find the liked song by matching the songId in the LikedSong collection
    const likedSong = await LikedSong.findOne({ song: songId });

    if (!likedSong) {
      return res
        .status(404)
        .json({ message: "Liked song not found for this user" });
    }

    // Remove the liked song from the user's likedSongs array
    const likedSongIndex = user.likedSongs.indexOf(likedSong._id);

    if (likedSongIndex !== -1) {
      user.likedSongs.splice(likedSongIndex, 1);
    }

    // Save the updated user document
    await user.save();

    // Remove the liked song from the LikedSong collection using deleteOne
    await LikedSong.deleteOne({ _id: likedSong._id });

    return res.status(200).json({ message: "Liked song removed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
