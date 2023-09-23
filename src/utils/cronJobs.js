// utils/cronJobs.js

import cron from "node-cron";
import {
  scrapeAndSaveSongs,
  removeDuplicateSongs,
} from "../services/scraperService.js";

// Schedule a cron job to scrape and save songs
export const scheduleSongScrapingJob = () => {
  cron.schedule(
    "0 6 * * *", // Schedule the job to run every day at 6 AM
    () => {
      // Define the URL to scrape songs from
      const scrapeUrl = "https://example.com/songs";

      // Call the service function to scrape and save songs
      scrapeAndSaveSongs(scrapeUrl)
        .then((savedSongs) => {
          console.log(`${savedSongs.length} songs saved to the database`);
        })
        .catch((error) => {
          console.error("Error scraping and saving songs:", error);
        });
    },
    {
      timezone: "Asia/Kolkata", // Set your timezone here
    }
  );
};

// Schedule a cron job to remove duplicate songs
export const scheduleDuplicateSongRemovalJob = () => {
  cron.schedule(
    "0 7 * * *", // Schedule the job to run every day at 7 AM
    () => {
      // Call the service function to remove duplicate songs
      removeDuplicateSongs()
        .then((removedDuplicates) => {
          console.log(`${removedDuplicates.length} duplicate songs removed`);
        })
        .catch((error) => {
          console.error("Error removing duplicate songs:", error);
        });
    },
    {
      timezone: "Asia/Kolkata", // Set your timezone here
    }
  );
};
