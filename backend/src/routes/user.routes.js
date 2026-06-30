import express from "express";
import multer from "multer";
import path from "path";
import auth from "../middlewares/auth.js";
import User from "../models/user.model.js";
import Video from "../models/video.model.js";
import Notes from "../models/notes.model.js";
import Access from "../models/access.model.js";
import NoteAccess from "../models/noteAccess.model.js";
import { randomInt } from "crypto";
import { uploadToCloudinary, removeLocalFileIfExists } from "../utils/cloudinary.js";
import { ensureUploadDir, uploadsRoot } from "../utils/uploadPaths.js";

const router = express.Router();
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, ensureUploadDir(path.join(uploadsRoot, "profile-pictures")));
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  }),
});

router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select("-password")
      .populate({
        path: "purchasedSkills",
        select: "title description cost uploadedBy uploadedby",
        populate: [
          { path: "uploadedBy", select: "name email" },
          { path: "uploadedby", select: "name email" },
        ],
      })
      .populate({
        path: "purchasedDocs",
        select: "title cost uploadedBy",
        populate: { path: "uploadedBy", select: "name email" },
      });
    return res.json(user);
  } catch (err) {
    return res.status(500).json({ message: "Server error " });
  }
});
router.get("/purchases", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select("purchasedSkills purchasedDocs")
      .populate({
        path: "purchasedSkills",
        select: "title description cost uploadedBy uploadedby",
        populate: [
          { path: "uploadedBy", select: "name email" },
          { path: "uploadedby", select: "name email" },
        ],
      })
      .populate({
        path: "purchasedDocs",
        select: "title cost uploadedBy",
        populate: { path: "uploadedBy", select: "name email" },
      });
    return res.json({
      purchasedSkills: user?.purchasedSkills || [],
      purchasedDocs: user?.purchasedDocs || [],
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
});

router.get("/content-access/:contentType/:contentId", auth, async (req, res) => {
  try {
    const { contentType, contentId } = req.params;
    if (!["video", "doc"].includes(contentType) || !contentId) {
      return res.status(400).json({ message: "Invalid access request" });
    }

    const isVideo = contentType === "video";
    const Model = isVideo ? Video : Notes;
    const AccessModel = isVideo ? Access : NoteAccess;
    const purchasedField = isVideo ? "purchasedSkills" : "purchasedDocs";
    const idField = isVideo ? "videoId" : "noteId";

    const content = await Model.findById(contentId);
    if (!content) {
      return res.status(404).json({ message: "Content not found" });
    }

    const user = await User.findById(req.userId).select(
      "purchasedSkills purchasedDocs",
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const ownerId =
      content.uploadedBy?.toString?.() || content.uploadedby?.toString?.();
    const isOwner = ownerId === req.userId;
    const purchased = user[purchasedField]?.some(
      (id) => String(id) === String(contentId),
    );
    const existingAccess = await AccessModel.findOne({
      userId: req.userId,
      [idField]: contentId,
    });

    return res.json({
      hasAccess: isOwner || purchased || Boolean(existingAccess),
      isOwner,
      purchased: purchased || Boolean(existingAccess),
    });
  } catch (err) {
    return res.status(500).json({ message: "Unable to check access" });
  }
});

router.post("/purchase-credits", auth, async (req, res) => {
  return res.status(410).json({
    message:
      "Use /api/payments/create-order and /api/payments/verify for Razorpay payments.",
  });
});

router.post("/unlock-content", auth, async (req, res) => {
  try {
    const { contentType, contentId } = req.body;
    if (!["video", "doc"].includes(contentType) || !contentId) {
      return res.status(400).json({ message: "Invalid unlock request" });
    }

    const isVideo = contentType === "video";
    const Model = isVideo ? Video : Notes;
    const AccessModel = isVideo ? Access : NoteAccess;
    const purchasedField = isVideo ? "purchasedSkills" : "purchasedDocs";
    const idField = isVideo ? "videoId" : "noteId";
    const content = await Model.findById(contentId);

    if (!content) {
      return res.status(404).json({ message: "Content not found" });
    }

    const ownerId =
      content.uploadedBy?.toString?.() || content.uploadedby?.toString?.();
    const user = await User.findById(req.userId).select(
      "credits purchasedSkills purchasedDocs",
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (ownerId === req.userId) {
      return res.json({
        message: "Your own content is always unlocked.",
        alreadyUnlocked: true,
        credits: user.credits,
        reward: 0,
        purchased: true,
      });
    }

    const alreadyPurchased = user[purchasedField]?.some(
      (id) => String(id) === String(contentId),
    );
    if (alreadyPurchased) {
      return res.json({
        message: "Content already unlocked.",
        alreadyUnlocked: true,
        credits: user.credits,
        reward: 0,
        purchased: true,
      });
    }

    const existingAccess = await AccessModel.findOne({
      userId: req.userId,
      [idField]: contentId,
    });
    if (existingAccess) {
      await User.findByIdAndUpdate(req.userId, {
        $addToSet: { [purchasedField]: contentId },
      });
      const refreshedUser = await User.findById(req.userId).select("credits");
      return res.json({
        message: "Content already unlocked.",
        alreadyUnlocked: true,
        credits: refreshedUser?.credits || 0,
        reward: 0,
        purchased: true,
      });
    }

    const rawCost = Number(content.cost);
    const cost =
      Number.isFinite(rawCost) && rawCost > 0
        ? Math.floor(rawCost)
        : isVideo
          ? 5
          : 3;
    // Reward is randomized each new unlock, strictly less than half of the cost.
    const maxReward = Math.ceil(cost / 2) - 1;
    const rewarded = maxReward > 0 ? randomInt(0, maxReward + 1) : 0;

    const deductedUser = await User.findOneAndUpdate(
      {
        _id: req.userId,
        credits: { $gte: cost },
        [purchasedField]: { $ne: contentId },
      },
      {
        $inc: { credits: -cost + rewarded },
        $addToSet: { [purchasedField]: contentId },
        $push: {
          unlockTransactions: {
            contentType,
            contentId,
            cost,
            reward: rewarded,
            netDeduction: cost - rewarded,
          },
        },
      },
      { new: true },
    ).select("-password");

    if (!deductedUser) {
      const latest = await User.findById(req.userId).select(
        `credits ${purchasedField}`,
      );
      const nowPurchased = latest?.[purchasedField]?.some(
        (id) => String(id) === String(contentId),
      );
      if (nowPurchased) {
        return res.json({
          message: "Content already unlocked.",
          alreadyUnlocked: true,
          credits: latest?.credits || 0,
          reward: 0,
          purchased: true,
        });
      }
      return res
        .status(400)
        .json({ message: "Insufficient Credits", requiredCredits: cost });
    }

    try {
      await AccessModel.create({ userId: req.userId, [idField]: contentId });
    } catch (e) {
      // Ignore duplicate unlock race and keep idempotent behavior.
    }

    return res.json({
      message: "Content unlocked successfully.",
      credits: deductedUser.credits,
      spentCredits: cost,
      reward: rewarded,
      rewardMessage:
        rewarded > 0 ? `🎉 You received ${rewarded} bonus credits!` : "",
      purchased: true,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Unlock failed. Please try again." });
  }
});

router.post("/add-skill", auth, async (req, res) => {
  try {
    const { skill } = req.body;

    if (!skill) {
      return res.status(400).json({ message: "Skill is required" });
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.skillsoffered.push(skill);

    await user.save();

    res.json({
      message: "Skill added",
      skillsOffered: user.skillsoffered,
    });
  } catch (err) {
    console.log("ADD SKILL ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/add-wanted-skill", auth, async (req, res) => {
  try {
    const { skill } = req.body;

    const user = await User.findById(req.userId);
    user.skillswanted.push(skill);
    await user.save();

    res.json({
      message: "Wanted skill added",
      skillswanted: user.skillswanted,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/update-profile", auth, async (req, res) => {
  try {
    const { name, gender, phone } = req.body;

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.name = name;
    user.gender = gender;
    user.phone = phone;

    await user.save();

    res.json({ message: "Profile updated" });
  } catch (err) {
    console.log("UPDATE PROFILE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post(
  "/upload-profile-picture",
  auth,
  upload.single("profilePicture"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ message: "Please choose a profile picture" });
      }

      const result = await uploadToCloudinary(req.file.path, {
        folder: "skill-exchange/profile-pictures",
        resource_type: "image",
        public_id: `${Date.now()}-${req.file.originalname.replace(/\.[^.]+$/, "")}`,
        originalname: req.file.originalname,
      });
      removeLocalFileIfExists(req.file.path);

      const user = await User.findById(req.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      user.profilePicture = result.secure_url;
      await user.save();

      return res.json({
        message: "Profile picture uploaded",
        profilePicture: user.profilePicture,
      });
    } catch (err) {
      console.error("Profile picture upload error:", err);
      return res.status(500).json({ message: "Profile picture upload failed" });
    }
  },
);

export default router;
