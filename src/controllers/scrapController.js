// controllers/scraperController.js

import axios from "axios";
import cheerio from "cheerio";
import Song from "../models/Song.js";

// Controller function to scrape and save song data from a website
export const scrapeAndSaveSongs = async (req, res) => {
  try {
    // URL of the website to scrape
    const scrapeUrl = "https://example.com/songs"; // Replace with your target URL

    // Fetch HTML content from the website
    const { data } = await axios.get(scrapeUrl);

    // Load HTML content using Cheerio
    const $ = cheerio.load(data);

    // Select and process song data elements
    $(".song-item").each(async (index, element) => {
      // Extract song data from the element
      const songName = $(element).find(".song-name").text().trim();
      const artist = $(element).find(".artist").text().trim();
      const album = $(element).find(".album").text().trim();

      // Create a new Song object
      const song = new Song({
        songName,
        artist,
        album,
      });

      // Save the song data to the database
      await song.save();
    });

    return res
      .status(200)
      .json({ message: "Scraping and saving songs completed" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
