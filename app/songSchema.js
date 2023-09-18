import { mongoose } from "mongoose";

// Define the schema
const songSchema = new mongoose.Schema({
  songName: {
    type: String,
    unique: true, // Create a unique index on the songName field
  },
  url: {
    type: String,
    unique: true, // Create a unique index on the url field
  },
  movie: String,
  castAndCrew: [String],
  music: String,
  director: String,
  producer: String,
  year: Number,
  totalSongs: Number,
  language: String,
});

songSchema.index({ year: -1 }); // 1 for ascending order, -1 for descending

// Create a Mongoose model from the schema
export const Song = mongoose.model("Song", songSchema);
