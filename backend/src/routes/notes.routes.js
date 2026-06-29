import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import mime from "mime-types";
import auth from "../middlewares/auth.js";
import Notes from "../models/notes.model.js";
import User from "../models/user.model.js";
import NoteAccess from "../models/noteAccess.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

const backendRoot = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "..",
  "..",
  "..",
);

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post("/", auth, upload.single("notes"), async (req, res) => {
  try {
    const { title, cost } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({ message: "Please choose a notes file to upload" });
    }

    const parsedCost = Number(cost);
    const safeCost =
      Number.isFinite(parsedCost) && parsedCost > 0
        ? Math.floor(parsedCost)
        : 3;

    const result = await uploadToCloudinary(req.file.buffer, {
      folder: "skill-exchange/notes",
      resource_type: "raw",
      public_id: `${Date.now()}-${req.file.originalname.replace(/\.[^.]+$/, "")}`,
    });

    const note = await Notes.create({
      title: title.trim(),
      cost: safeCost,
      filepath: result.secure_url,
      filename: req.file.originalname,
      uploadedBy: req.userId,
    });

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $inc: { credits: 20 } },
      { new: true },
    );

    return res.json({
      message: "Notes uploaded - gained 20 credits",
      credits: user?.credits ?? 0,
      note,
    });
  } catch (err) {
    console.error("Notes upload error:", err);
    return res.status(500).json({ message: "Notes upload failed" });
  }
});

router.get("/", async (req, res) => {
  const notes = await Notes.find().populate("uploadedBy", "name email");
  res.json(notes);
});

router.get("/:id", async (req, res) => {
  try {
    const note = await Notes.findById(req.params.id).populate(
      "uploadedBy",
      "name email",
    );
    if (!note) return res.status(404).json({ message: "Note not found" });

    const { filepath, ...safe } = note.toObject();
    res.json(safe);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/download/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const note = await Notes.findById(req.params.id);
    if (!note) return res.status(404).json({ message: "Note not found" });

    const notePath = (note.filepath || "").replaceAll("\\", "/");
    const isCloudinaryUrl = /^https?:\/\//i.test(notePath);

    const isOwner = note.uploadedBy?.toString?.() === req.userId;

    if (isCloudinaryUrl) {
      const remoteResponse = await fetch(notePath);
      if (!remoteResponse.ok) {
        return res.status(404).json({ message: "File missing on server" });
      }
      const type =
        mime.lookup(note.filename) ||
        remoteResponse.headers.get("content-type") ||
        "application/octet-stream";
      res.setHeader("Content-Type", type);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${note.filename}"`,
      );
      res.setHeader("X-Remaining-Credits", user.credits);
      return res.send(Buffer.from(await remoteResponse.arrayBuffer()));
    }

    const absolutePath = path.resolve(backendRoot, notePath);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: "File missing on server" });
    }

    if (isOwner) {
      const type = mime.lookup(note.filename) || "application/octet-stream";
      res.setHeader("Content-Type", type);
      res.setHeader("X-Remaining-Credits", user.credits);
      return res.download(absolutePath, note.filename);
    }

    const already = await NoteAccess.findOne({
      userId: req.userId,
      noteId: note._id,
    });

    const purchased = user.purchasedDocs?.some(
      (id) => String(id) === String(note._id),
    );

    if (!already && !purchased) {
      return res
        .status(403)
        .json({ message: "Please unlock these notes before downloading" });
    }

    await User.findByIdAndUpdate(req.userId, {
      $addToSet: { purchasedDocs: note._id },
    });

    const type = mime.lookup(note.filename) || "application/octet-stream";
    res.setHeader("Content-Type", type);
    res.setHeader("X-Remaining-Credits", user.credits);

    return res.download(absolutePath, note.filename);
  } catch (err) {
    console.error("Notes download error:", err);
    return res.status(500).json({ message: "Download failed" });
  }
});

export default router;
