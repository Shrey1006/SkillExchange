import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const backendRoot = path.resolve(__dirname, "..", "..");
export const uploadsRoot = path.join(backendRoot, "uploads");
export const videosUploadDir = path.join(uploadsRoot, "videos");
export const notesUploadDir = path.join(uploadsRoot, "notes");

export function ensureUploadDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

export function buildUploadPath(...parts) {
  return parts.join("/").replaceAll("\\", "/");
}

export function resolveStoredUploadPath(storedPath) {
  const normalized = String(storedPath || "").replaceAll("\\", "/");
  if (/^https?:\/\//i.test(normalized)) {
    return null;
  }

  const relative = normalized.replace(/^\/?uploads\/?/, "");
  return path.join(uploadsRoot, relative);
}
