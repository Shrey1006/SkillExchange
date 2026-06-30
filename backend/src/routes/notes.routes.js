import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import mime from "mime-types";
import auth from "../middlewares/auth.js";
import Notes from "../models/notes.model.js";
import User from "../models/user.model.js";
import NoteAccess from "../models/noteAccess.model.js";
import { uploadToCloudinary, removeLocalFileIfExists } from "../utils/cloudinary.js";
import {
  ensureUploadDir,
  notesUploadDir,
  resolveStoredUploadPath,
} from "../utils/uploadPaths.js";

const router = express.Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, ensureUploadDir(notesUploadDir));
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  }),
});

router.post(
  "/",
  auth,
  (req, res, next) => {
    upload.single("notes")(req, res, (err) => {
      if (err) {
        console.error("Notes upload multer error:", err);
        return res.status(400).json({
          message: "File upload failed",
          error: err.message,
        });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      console.log("notes upload request", {
        path: req.path,
        body: req.body,
        file: req.file,
        userId: req.userId,
      });
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

      const filename = req.file.originalname;
      const result = await uploadToCloudinary(req.file.path, {
        folder: "skill-exchange/notes",
        resource_type: "raw",
        public_id: `${Date.now()}-${filename.replace(/\.[^.]+$/, "")}`,
        originalname: filename,
      });
      removeLocalFileIfExists(req.file.path);

      const note = await Notes.create({
        title: title.trim(),
        cost: safeCost,
        filepath: result.secure_url,
        filename,
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
      return res.status(500).json({
        message: "Notes upload failed",
        error: err?.message || "Unknown error",
        stack: err?.stack || "",
      });
    }
  },
);

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

    const absolutePath = resolveStoredUploadPath(notePath);

    if (!absolutePath || !fs.existsSync(absolutePath)) {
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
