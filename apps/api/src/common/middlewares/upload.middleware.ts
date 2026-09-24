import multer from "multer";
import { env } from "../../config/environment";
import { HttpError } from "../utils/http-error";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(HttpError.unprocessable("Tipe berkas tidak diizinkan", [
        { field: "file", message: "Hanya gambar (JPG, PNG, WEBP) atau PDF yang diizinkan" },
      ]));
      return;
    }
    callback(null, true);
  },
});

export const uploadSingleFile = upload.single("file");
