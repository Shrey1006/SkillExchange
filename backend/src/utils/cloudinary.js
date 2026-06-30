import fs from "fs";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import { ensureUploadDir, uploadsRoot } from "./uploadPaths.js";

function buildLocalUploadUrl(relativePath) {
  const baseUrl =
    process.env.CLIENT_ORIGIN || process.env.APP_URL || "http://localhost:5000";
  return `${baseUrl.replace(/\/$/, "")}/uploads/${relativePath.replaceAll("\\", "/")}`;
}

function getUploadBuffer(input) {
  if (Buffer.isBuffer(input)) {
    return input;
  }

  if (typeof input === "string") {
    if (fs.existsSync(input)) {
      return fs.readFileSync(input);
    }

    return Buffer.from(input);
  }

  return Buffer.from(String(input ?? ""));
}

function configureCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  return cloudinary;
}

export async function uploadToCloudinary(input, options = {}) {
  const {
    folder = "skill-exchange",
    resource_type = "auto",
    originalname = "upload",
    ...rest
  } = options;

  const hasCloudinaryCreds = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET,
  );

  if (!hasCloudinaryCreds) {
    const safeFolder = String(folder).replace(/[^a-zA-Z0-9/_-]/g, "-");
    const relativeDir = path.join(
      "skill-exchange",
      safeFolder.replace(/^skill-exchange\/?/, ""),
    );
    const absoluteDir = path.resolve(uploadsRoot, relativeDir);
    ensureUploadDir(absoluteDir);

    const ext = path.extname(originalname || "upload") || "";
    const filename = `${Date.now()}-${path.basename(originalname || "upload", ext)}${ext}`;
    const absolutePath = path.join(absoluteDir, filename);
    const uploadBuffer = getUploadBuffer(input);
    fs.writeFileSync(absolutePath, uploadBuffer);

    const uploadUrl = buildLocalUploadUrl(path.join(relativeDir, filename));
    return {
      secure_url: uploadUrl,
      public_id: filename,
      fallback: true,
    };
  }

  const configuredCloudinary = configureCloudinary();
  const uploadBuffer = getUploadBuffer(input);

  return new Promise((resolve, reject) => {
    const uploadStream = configuredCloudinary.uploader.upload_stream(
      {
        folder,
        resource_type,
        ...rest,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      },
    );

    uploadStream.end(uploadBuffer);
  });
}

export function removeLocalFileIfExists(filePath) {
  if (typeof filePath !== "string" || !fs.existsSync(filePath)) {
    return;
  }

  try {
    fs.unlinkSync(filePath);
  } catch {
    // ignore cleanup failures
  }
}
