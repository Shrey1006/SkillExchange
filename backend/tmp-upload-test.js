import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const app = express();
const upload = multer({ dest: path.join(process.cwd(), "tmp-test-artifacts") });
app.post("/test", upload.single("notes"), (req, res) => {
  console.log("received file", req.file);
  res.json({ ok: true, file: req.file });
});
app.listen(5001, () => console.log("test server running"));
