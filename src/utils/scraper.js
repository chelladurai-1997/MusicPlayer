// utils/scraper.js

import axios from "axios";
import cheerio from "cheerio";

// Function to scrape songs from a website
export const scrapeSongs = async (scrapeUrl) => {
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

    return songs;
  } catch (error) {
    throw error;
  }
};
