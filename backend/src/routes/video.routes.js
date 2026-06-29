import express from "express";
import multer from "multer";
import auth from "../middlewares/auth.js";
import Video from "../models/video.model.js";
import User from "../models/user.model.js";
import Access from "../models/access.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

//  PUBLIC FEED
router.get("/", async (req, res) => {
  const videos = await Video.find()
    .populate("uploadedBy", "name email")
    .populate("uploadedby", "name email");
  res.json(videos);
});

// GET SINGLE VIDEO DETAILS (safe payload)
router.get("/:id", async (req, res) => {
  try {
    const video = await Video.findById(req.params.id).populate(
      "uploadedBy",
      "name email",
    );
    if (!video) return res.status(404).json({ message: "Video not found" });

    const { filepath, ...safe } = video.toObject();
    res.json(safe);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

//  UPLOAD VIDEO FROM PC
router.post("/", auth, upload.single("video"), async (req, res) => {
  try {
    const { title, description, cost } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({ message: "Please choose a video file to upload" });
    }

    const parsedCost = Number(cost);
    const safeCost =
      Number.isFinite(parsedCost) && parsedCost > 0
        ? Math.floor(parsedCost)
        : 5;

    const result = await uploadToCloudinary(req.file.buffer, {
      folder: "skill-exchange/videos",
      resource_type: "video",
      public_id: `${Date.now()}-${req.file.originalname.replace(/\.[^.]+$/, "")}`,
    });

    await Video.create({
      title: title.trim(),
      description: description?.trim?.() || "",
      cost: safeCost,
      filepath: result.secure_url,
      filename: req.file.originalname,
      uploadedBy: req.userId,
      uploadedby: req.userId,
    });

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $inc: { credits: 30 } },
      { new: true },
    );

    return res.json({
      credits: user?.credits ?? 0,
      message: "Video uploaded!",
    });
  } catch (err) {
    console.error("Video upload error:", err);
    return res.status(500).json({ message: "Video upload failed" });
  }
});

//  WATCH WITH CREDITS
router.post("/watch/:id", auth, async (req, res) => {
  const user = await User.findById(req.userId);
  const video = await Video.findById(req.params.id);
  if (!video) return res.status(404).json({ message: "Video not found" });

  const videoPath = (video.filepath || "").replaceAll("\\", "/");

  // If it's your own upload, don't deduct credits.
  if (
    video.uploadedBy?.toString?.() === req.userId ||
    video.uploadedby?.toString?.() === req.userId
  ) {
    return res.json({ path: videoPath, credits: user.credits });
  }

  //  CHECK IF ALREADY PURCHASED
  const already = await Access.findOne({
    userId: req.userId,
    videoId: video._id,
  });

  if (already) {
    await User.findByIdAndUpdate(req.userId, {
      $addToSet: { purchasedSkills: video._id },
    });
    // allow without deduction
    return res.json({
      path: videoPath,
      credits: user.credits,
    });
  }

  //  FIRST TIME → deduct
  if (user.credits < video.cost) {
    return res.status(400).json({ message: "Not enough credits" });
  }

  user.credits -= video.cost;
  await user.save();
  await User.findByIdAndUpdate(req.userId, {
    $addToSet: { purchasedSkills: video._id },
  });

  //SAVE ACCESS RECORD
  await Access.create({
    userId: req.userId,
    videoId: video._id,
  });

  res.json({
    path: videoPath,
    credits: user.credits,
  });
});

export default router;
