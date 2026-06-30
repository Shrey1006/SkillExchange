import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { uploadToCloudinary } from "../src/utils/cloudinary.js";
import { resolveStoredUploadPath } from "../src/utils/uploadPaths.js";
import Video from "../src/models/video.model.js";
import Notes from "../src/models/notes.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

function isCloudinaryUrl(storedPath) {
  return /^https?:\/\//i.test(String(storedPath || ""));
}

function resolveLocalFile(storedPath) {
  if (isCloudinaryUrl(storedPath)) {
    return null;
  }

  const resolved = resolveStoredUploadPath(storedPath);
  if (resolved && fs.existsSync(resolved)) {
    return resolved;
  }

  return null;
}

async function migrateCollection(Model, { resourceType, folder, label }) {
  const docs = await Model.find({});
  let migrated = 0;
  let skipped = 0;
  let missing = 0;

  for (const doc of docs) {
    if (isCloudinaryUrl(doc.filepath)) {
      skipped += 1;
      console.log(`[skip] ${label} already on Cloudinary: ${doc.title}`);
      continue;
    }

    const localPath = resolveLocalFile(doc.filepath);
    if (!localPath) {
      missing += 1;
      console.warn(
        `[missing] ${label} file not found for "${doc.title}" (${doc.filepath})`,
      );
      continue;
    }

    const originalname = doc.filename || path.basename(localPath);
    const result = await uploadToCloudinary(localPath, {
      folder,
      resource_type: resourceType,
      originalname,
      public_id: `${Date.now()}-${originalname.replace(/\.[^.]+$/, "")}`,
    });

    doc.filepath = result.secure_url;
    await doc.save();
    migrated += 1;
    console.log(`[ok] ${label} migrated: ${doc.title}`);
    console.log(`     ${result.secure_url}`);
  }

  return { migrated, skipped, missing };
}

async function main() {
  if (!process.env.MONGO_URL) {
    throw new Error("MONGO_URL is not configured.");
  }

  await mongoose.connect(process.env.MONGO_URL);

  const videoStats = await migrateCollection(Video, {
    resourceType: "video",
    folder: "skill-exchange/videos",
    label: "Video",
  });
  const noteStats = await migrateCollection(Notes, {
    resourceType: "raw",
    folder: "skill-exchange/notes",
    label: "Note",
  });

  console.log("\nMigration summary");
  console.log("Videos:", videoStats);
  console.log("Notes:", noteStats);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
