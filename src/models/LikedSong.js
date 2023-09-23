// models/LikedSong.js

import mongoose from "mongoose";

const likedSongSchema = new mongoose.Schema({
  song: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Song",
    required: true,
  },
});

const LikedSong = mongoose.model("LikedSong", likedSongSchema);

export default LikedSong;
