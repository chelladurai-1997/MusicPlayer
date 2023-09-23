// services/songService.js

import Song from "../models/Song.js";

// Service function to retrieve a list of songs with pagination and search
export const getSongsSerive = async (page = 1, limit = 20, query = "") => {
  try {
    const skip = (page - 1) * limit;

    // Define a flexible search filter
    const searchFilter = {
      $or: [
        { songName: { $regex: query, $options: "i" } }, // Case-insensitive song name search
        { movie: { $regex: query, $options: "i" } }, // Case-insensitive movie search
        { music: { $regex: query, $options: "i" } }, // Case-insensitive music director search
        { director: { $regex: query, $options: "i" } }, // Case-insensitive director search
        { language: { $regex: query, $options: "i" } }, // Case-insensitive language search
        { castAndCrew: { $in: [query] } }, // Exact match for cast and crew,
      ],
    };

    // Query the database with pagination and search filter
    const songs = await Song.find(searchFilter)
      .sort({ year: -1 })
      .skip(skip)
      .limit(limit);

    // Calculate the total count of matching songs
    const totalCount = await Song.countDocuments(searchFilter);
    const totalPages = Math.ceil(totalCount / limit);

    return {
      totalCount,
      currentPage: page,
      totalPages,
      data: songs,
    };
  } catch (error) {
    throw error;
  }
};
