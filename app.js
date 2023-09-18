import axios from "axios";
import cheerio from "cheerio";
import cron from "node-cron";
import * as fs from "node:fs";
import express from "express";
import { mongoose } from "mongoose";
import dotenv from "dotenv";
import { Song } from "./app/songSchema.js";
import { networkInterfaces } from "node:os";

const app = express();
const port = 3000;

dotenv.config();
const connect = async () => {
  try {
    mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    const connection = mongoose.connection;

    connection.on("connected", () => {
      console.log("MongoDB connected successfully");
    });

    connection.on("error", (err) => {
      console.log(
        "MongoDB connection error. Please make sure MongoDB is running. " + err
      );
      process.exit();
    });
  } catch (error) {
    console.log("Something goes wrong!");
    console.log(error);
  }
};
connect();

// Schedule the job to run every day at 6 AM (0 6 * * *)
const job = cron.schedule(
  "0 6 * * *",
  () => {
    // This function will be executed at 6 AM every day

    [...new Array(53)].forEach((n, i) => {
      scrapeYearSpecificMoviesData(
        `https://isaiminisong.com/songs/tamil-${1970 + i}-songs/`
      );
    });
  },
  {
    timezone: "Asia/Kolkata", // Set your timezone here, e.g., 'America/New_York'
  }
);

// Start the cron job
job.start();

// You can stop the cron job using job.stop() when needed

app.get("/api/songs", async (req, res) => {
  try {
    const songs = await Song.find(); // Retrieve all documents from the collection
    res.json({
      totalCount: songs?.length,
      data: songs,
    }); // Send the data as a JSON response
  } catch (error) {
    console.error("Error retrieving data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/search-songs", async (req, res) => {
  try {
    const query = req.query.q; // Get the search query from the request

    // Define a flexible search filter to search across multiple fields
    const searchFilter = {
      $or: [
        { songName: { $regex: query, $options: "i" } }, // Case-insensitive song name search
        { movie: { $regex: query, $options: "i" } }, // Case-insensitive movie search
        { music: { $regex: query, $options: "i" } }, // Case-insensitive music director search
        { director: { $regex: query, $options: "i" } }, // Case-insensitive director search
        { language: { $regex: query, $options: "i" } }, // Case-insensitive language search
        { castAndCrew: { $in: [query] } }, // Exact match for cast and crew
      ],
    };

    // Find songs based on the search filter
    const songs = await Song.find(searchFilter);

    if (songs.length === 0) {
      res.status(404).json({ error: "No matching songs found" });
      return;
    }

    res.json(songs); // Send the matching songs as a JSON response
  } catch (error) {
    console.error("Error searching for songs:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Create an Express route to retrieve unique music director names
app.get("/api/getMovieNames", async (req, res) => {
  try {
    const uniqueMovies = await Song.distinct("movie");
    res.json(uniqueMovies);
  } catch (error) {
    console.error("Error retrieving Movies:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// URL of the page we want to scrape
const url = "https://isaiminisong.com/songs";
const wholeData = [];
// Async function which scrapes the data
async function scrapeData() {
  try {
    // Fetch HTML of the page we want to scrape
    const { data } = await axios.get(url);
    // Load HTML we fetched in the previous line
    const $ = cheerio.load(data);
    // Select all the list items in plainlist class
    const listItems = $("#block-8 > ul > li > a")
      .toArray()
      .map((c) => {
        return { yearList: url + c.attributes[0].value };
      });

    listItems.forEach((c) => {
      scrapeYearSpecificMoviesData(c.yearList);
    });
  } catch (err) {
    console.error(err);
  }
}

async function scrapeYearSpecificMoviesData(yearSpeficUrl) {
  try {
    // const yearSpeficUrl = "https://isaiminisong.com/songs/tamil-2014-songs/";
    // Fetch HTML of the page we want to scrape
    const { data } = await axios.get(yearSpeficUrl);
    // Load HTML we fetched in the previous line
    const $ = cheerio.load(data);
    // Select all the list items in plainlist class
    const listItems = $(".page-pagination")
      .find("a")
      .toArray()
      .map((c) => Number($(c).text()))
      .filter((d) => !isNaN(d));
    const moviesCount = Math.max(...listItems);
    console.log("moviesCount", moviesCount);

    if (moviesCount > 0) {
      [...new Array(moviesCount)].forEach((_, index) => {
        const nextPage = (index + 1).toString();
        scrapeAllTheAvailablePages(yearSpeficUrl + "page/" + nextPage);
      });
    } else {
      scrapeAllTheAvailablePages(yearSpeficUrl + "page/" + "1");
    }
  } catch (err) {
    console.error(err);
  }
}

async function scrapeAllTheAvailablePages(pagesUrl) {
  try {
    // const yearSpeficUrl = "https://isaiminisong.com/songs/tamil-2022-songs/page/1";
    // Fetch HTML of the page we want to scrape
    const { data } = await axios.get(pagesUrl);
    // Load HTML we fetched in the previous line
    const $ = cheerio.load(data);
    // Select all the list items in plainlist class
    const listItems = $(".post-thumbnail")
      .find("a")
      .toArray()
      .map((c) => {
        // console.log("attributes", c.attributes);
        return { movieUrl: c.attributes[0].value };
      });
    // console.log(listItems);
    if (listItems.length > 0) {
      listItems.forEach((c) => {
        scrapeAlbumInfos(c.movieUrl);
      });
    }
  } catch (err) {
    console.error(err);
  }
}

app.get("/checkAndRemoveDuplicates", (req, res) => {
  // Define an aggregation pipeline to find duplicates based on "songName"
  // Define an aggregation pipeline to find duplicates based on "songName"
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

  // Use the aggregate() method and then exec() to execute the aggregation
  Song.aggregate(aggregationPipeline)
    .exec()
    .then((duplicates) => {
      console.log("duplicates", duplicates);
      // Handle the result here
      duplicates.forEach((duplicate) => {
        const [keepId, ...removeIds] = duplicate.duplicateIds;

        // Remove duplicates except the first one (keepId)
        Song.deleteMany({ _id: { $in: removeIds } })
          .then(() => {
            console.log(
              `Deleted ${removeIds.length} duplicates for songName: ${duplicate._id.songName}`
            );
          })
          .catch((deleteErr) => {
            console.error("Error deleting duplicates:", deleteErr);
          });
      });
    })

    .catch((err) => {
      console.error("Error finding duplicates:", err);
    });
});

async function scrapeAlbumInfos(pagesUrl) {
  try {
    // Fetch HTML of the page we want to scrape
    const { data } = await axios.get(pagesUrl);
    // Load HTML we fetched in the previous line
    const $ = cheerio.load(data);

    // Iterate through the <strong> elements to extract the key-value pairs
    const keyValuePairs = {};

    // Regular expression to match <strong> tags and their contents
    const regex = /<strong>(.*?)<\/strong>([^<]*)/g;

    const movieDetails = $(".has-text-align-left").toString();

    let match;
    while ((match = regex.exec(movieDetails)) !== null) {
      const key = match[1].trim();
      const value = match[2].trim();
      keyValuePairs[key] = value;
    }

    const ringtones = [];

    $(".ringtones").each((index, element) => {
      const songname = $(element).find(".songname").text().trim();

      const songUrl = $(element).find(".downloadinfo > a").attr("href");

      if (songUrl) {
        ringtones.push({
          songName: songname,
          url: "https://isaiminisong.com" + songUrl,
          ...keyValuePairs,
        });
      } else {
        console.log("Errr===>", pagesUrl);
      }
    });

    const transformedData = ringtones.map((c) => ({
      songName: c["songName"],
      url: c["url"],
      movie: c["Movie:"],
      castAndCrew: c["Cast and Crew:"]?.split(","),
      music: c["Music:"],
      director: c["Director:"],
      producer: c["Producer:"],
      year: c["Year:"],
      totalSongs: c["Total Songs:"],
      language: c["Language:"],
    }));

    Song.insertMany(transformedData)
      .then((result) => {
        console.log(`${result.length} songs saved to the database`);
      })
      .catch((error) => {
        // console.error("Error bulk uploading songs:", error);
      });
  } catch (err) {
    console.error(err);
  }
}

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

async function getImages() {
  try {
    const yearSpeficUrl =
      "https://www.google.com/search?sca_esv=566121062&rlz=1C1RXQR_enIN962IN962&hl=en&q=Vettaikaran+hd+images+download&uds=H4sIAAAAAAAA_-Ny5uJwyS_Py8lPTBESLUstKUnMzE4sSsxTyEhRyMxNTE8tNhAqkgvDJqGQAtVohF0jACoOP0xcAAAA&tbm=isch&source=lnms&sa=X&ved=2ahUKEwiHiYbWv7KBAxW5TWwGHTa-BykQ0pQJegQICxAB&biw=1280&bih=563&dpr=1.5";
    // Fetch HTML of the page we want to scrape
    const { data } = await axios.get(yearSpeficUrl);
    // Load HTML we fetched in the previous line
    const $ = cheerio.load(data);
    // Select all the 'img' elements and get their 'src' attributes
    const imageSrcs = [];

    $("img").each((index, element) => {
      const src = $(element).attr("src");
      if (src?.includes("https")) {
        imageSrcs.push(src);
      }
    });

    // Display the image source URLs
    console.log(imageSrcs);
  } catch (err) {
    console.error(err);
  }
}
