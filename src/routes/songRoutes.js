// routes/songRoutes.js

import express from "express";
import * as songController from "../controllers/songController.js";
import requireAuth from "../middleware/requireAuth.js";

const router = express.Router();

// Route to get songs by page
router.get("/", songController.getSongs);

// Route to add a song to a user's liked songs
router.post("/:userId/liked-songs", requireAuth, songController.addLikedSong);

// Route to retrieve all liked songs for a user
router.get("/:userId/liked-songs", requireAuth, songController.getLikedSongs);

// Route to remove a liked song for a user based on songId
router.post(
  "/:userId/remove-liked-song/:songId",
  songController.removeLikedSong
);

export default router;
