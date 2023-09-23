// services/scraperService.js

import axios from "axios";
import cheerio from "cheerio";
import Song from "../models/Song.js";

// Service function to scrape and save songs from a website
export const scrapeAndSaveSongs = async (scrapeUrl) => {
  try {
    // Fetch HTML content from the website
    const { data } = await axios.get(scrapeUrl);

    // Load HTML content using Cheerio
    const $ = cheerio.load(data);

    // Select and process song data elements
    const songs = [];

    $(".song-item").each((index, element) => {
      // Extract song data from the element
      const songName = $(element).find(".song-name").text().trim();
      const artist = $(element).find(".artist").text().trim();
      const album = $(element).find(".album").text().trim();

      // Create a song object
      const song = {
        songName,
        artist,
        album,
      };

      songs.push(song);
    });

    // Save the scraped songs to the database
    const savedSongs = await Song.insertMany(songs);

    return savedSongs;
  } catch (error) {
    throw error;
  }
};

// Service function to remove duplicate songs from the database
export const removeDuplicateSongs = async () => {
  try {
    // Define an aggregation pipeline to find duplicate songs based on songName
    const aggregationPipeline = [
      {
        $group: {
          _id: { songName: "$songName" }, // Group by songName
          count: { $sum: 1 }, // Count occurrences
          duplicateIds: { $push: "$_id" }, // Collect duplicate IDs
        },
      },
      {
        $match: {
          count: { $gt: 1 }, // Filter only duplicates
        },
      },
    ];

    // Find and remove duplicates
    const duplicates = await Song.aggregate(aggregationPipeline).exec();
    const removedDuplicates = [];

    for (const duplicate of duplicates) {
      const [keepId, ...removeIds] = duplicate.duplicateIds;

      // Remove duplicates except the first one (keepId)
      const result = await Song.deleteMany({ _id: { $in: removeIds } });
      removedDuplicates.push({
        songName: duplicate._id.songName,
        removedCount: result.deletedCount,
      });
    }

    return removedDuplicates;
  } catch (error) {
    throw error;
  }
};
