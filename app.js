import axios from "axios";
import cheerio from "cheerio";
import cron from "node-cron";
import express from "express";
import { mongoose } from "mongoose";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import puppeteer from "puppeteer-extra";

import { Song } from "./app/songSchema.js";
import { User, LikedSong } from "./app/userSchema.js";

const app = express();

// Middleware to parse JSON data in the request body
app.use(bodyParser.json());
const port = 3000;

// parse application/json
app.use(bodyParser.json());

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
      app.listen(port, () => {
        console.log(`Example app listening on port ${port}`);
      });
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

app.get("/getComments/:url", (req, res) => {
  const url = req.params.url;
  const videoUrl = `https://www.youtube.com/watch?v=${url}`;
  const maxScrolls = 5; // Adjust this value based on how many times you want to scroll

  // Helper function to validate and clean text

  async function scrapeComments(videoUrl, maxScrolls) {
    const browser = await puppeteer.launch({
      args: [
        "--disable-setuid-sandbox",
        "--no-sandbox",
        "--single-process",
        "--no-zygote",
      ],
      executablePath:
        process.env.NODE_ENV === "production"
          ? process.env.PUPPETEER_EXECUTABLE_PATH
          : puppeteer.executablePath(),
    });
    const page = await browser.newPage();
    await page.goto(videoUrl);

    // Scroll to the bottom of the page with a configurable number of scrolls
    await autoScroll(page, maxScrolls);

    // Extract comments
    const comments = await page.evaluate(() => {
      const commentElements = document.querySelectorAll(
        "ytd-comment-thread-renderer"
      );

      const commentsArray = [];
      function validateAndClean(text) {
        // Check if the text is a valid string
        if (typeof text !== "string") {
          return ""; // Return an empty string if the input is not a string
        }

        // Remove leading and trailing whitespaces
        let cleanedText = text.trim();

        // Handle special characters (remove or replace as needed)
        cleanedText = cleanedText.replace(
          /[^\w\s\u0B80-\u0BFF.?!@#$%^&*()-]/g,
          ""
        );

        return cleanedText;
      }

      commentElements.forEach((commentElement) => {
        const author = commentElement.querySelector("#author-text").innerText;
        const timestamp = validateAndClean(
          commentElement.querySelector(".published-time-text").innerText
        );
        const content = validateAndClean(
          commentElement.querySelector("#content-text").innerText
        );
        const likes = validateAndClean(
          commentElement.querySelector("#vote-count-middle").innerText
        );

        commentsArray.push({
          author,
          timestamp,
          content,
          likes,
        });
      });

      return commentsArray;
    });

    await browser.close();

    return comments;
  }

  // Function to scroll to the bottom of the page
  async function autoScroll(page, maxScrolls) {
    await page.evaluate(async (maxScrolls) => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 500;

        const timer = setInterval(() => {
          const scrollHeight = document.documentElement.scrollHeight;

          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight || maxScrolls === 0) {
            clearInterval(timer);
            resolve();
          }
        }, 1000); // You can adjust the interval if needed
      });
    }, maxScrolls);
  }

  scrapeComments(videoUrl, maxScrolls)
    .then((comments) => {
      const sorted = comments.sort((a, b) => {
        const likesA = a.likes?.includes("K")
          ? Number(Number(a.likes.replace("K", "")) * 1000)
          : Number(a.likes); // Convert '1.5K' to 1500
        const likesB = b.likes?.includes("K")
          ? Number(Number(b.likes.replace("K", "")) * 1000)
          : Number(b.likes); // Convert '1.5K' to 1500

        return likesB - likesA;
      });
      res.json({ count: sorted?.length, comments: sorted?.slice(0, 50) });
      console.log(comments?.length);
      console.log(JSON.stringify(comments, null, 2));
    })
    .catch((error) => {
      console.error("Error:", error);
      res.json({ err: true });
    });
});

// Define a POST route for user registration
app.post("/register", async (req, res) => {
  try {
    // Extract user data from the request body
    const { email, password } = req.body;

    // Create a new user using the User model
    const newUser = new User({
      email,
      password,
    });

    // Save the user to the database using await
    const user = await newUser.save();

    console.log("User created:", user);
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Error creating user:", error);

    if (error.code === 11000) {
      // MongoDB error code 11000 indicates a duplicate key error
      return res.status(200).json({ message: "email-Id is already in use" });
    }
    res.status(500).json({ message: "Error registering user", error: error });
  }
});

// Create a LikedSong and associate it with a User
app.post("/users/:userId/liked-songs", async (req, res) => {
  const userId = req.params.userId;
  const { songId } = req.body; // Assuming you provide the song ID in the request body

  try {
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
});

// Retrieve all liked songs for a user
app.get("/users/:userId/liked-songs", async (req, res) => {
  const userId = req.params.userId;

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
});

// Remove a liked song for a user based on songId
app.post("/users/:userId/remove-liked-song/:songId", async (req, res) => {
  const userId = req.params.userId;
  const songId = req.params.songId;

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
});

// Schedule the job to run every day at 6 AM (0 6 * * *)
const job = cron.schedule(
  "*/5 * * * *",
  () => {
    // This function will be executed at 6 AM every day
    [...new Array(5)].forEach((n, i) => {
      const lookUpYear = getRandomYear() - i;
      scrapeYearSpecificMoviesData(
        `https://isaiminisong.com/songs/tamil-${lookUpYear}-songs/`
      );
    });
  },
  {
    timezone: "Asia/Kolkata", // Set your timezone here, e.g., 'America/New_York'
  }
);

// Start the cron job
job.start();

app.get("/fetch", () => {
  // This function will be executed at 6 AM every day
  [...new Array(5)].forEach((n, i) => {
    const lookUpYear = getRandomYear() - i;
    scrapeYearSpecificMoviesData(
      `https://isaiminisong.com/songs/tamil-${lookUpYear}-songs/`
    );
  });
});

// You can stop the cron job using job.stop() when needed

app.get("/api/songs", async (req, res) => {
  const page = parseInt(req.query.page) || 1; // Get the requested page number from query parameters (default to page 1 if not provided)
  const limit = parseInt(req.query.limit) || 10; // Set a default limit per page (e.g., 10)

  try {
    const skip = (page - 1) * limit; // Calculate the number of documents to skip based on the page number and limit
    const query = Song.find({}).skip(skip).limit(limit).sort({ year: -1 }); // Sort by year in descending order, adjust sorting as needed
    const songs = await query.exec();

    res.json({
      totalCount: await Song.countDocuments(), // Get the total count of documents in the collection
      currentPage: page,
      totalPages: Math.ceil((await Song.countDocuments()) / limit), // Calculate the total number of pages
      data: songs,
    });
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
    const songs = await Song.find(searchFilter).limit(5000).exec();

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

function getRandomYear() {
  const currentYear = new Date().getFullYear();
  const minYear = 1980;
  const range = currentYear - minYear + 1;
  return minYear + Math.floor(Math.random() * range);
}
