import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import multer from "multer";
import { fileTypeFromFile } from "file-type";
import HttpAppError from "../Utils/Errors/app.error.js";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export const PROFILE_PICTURES_DIR = path.resolve("uploads", "profile-pictures");

// 1) where + with what name the file is saved on the disk
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        fs.mkdirSync(PROFILE_PICTURES_DIR, { recursive: true });
        cb(null, PROFILE_PICTURES_DIR);
    },
    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();
        cb(null, `${Date.now()}-${crypto.randomUUID()}${extension}`);
    },
});

// 2) first check: the mimetype that the client sent (can be faked)
const fileFilter = (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return cb(new HttpAppError("Only jpeg, png and webp images are allowed", 400, {}, "INVALID_FILE_TYPE"));
    }
    cb(null, true);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE } });

// 3) second check: magic numbers = the real first bytes of the file (can not be faked)
const checkMagicNumbers = async (req, res, next) => {
    if (!req.file) {
        return next(new HttpAppError("Image is required (form-data key: image)", 400, {}, "FILE_REQUIRED"));
    }

    const detected = await fileTypeFromFile(req.file.path);

    if (!detected || !ALLOWED_MIME_TYPES.includes(detected.mime)) {
        fs.unlink(req.file.path, () => {});
        return next(new HttpAppError("File content is not a valid image", 400, {}, "INVALID_FILE_CONTENT"));
    }

    next();
};

// turns multer errors (like file too large) into our normal error format
const uploadSingleImage = (req, res, next) => {
    upload.single("image")(req, res, (error) => {
        if (!error) return next();

        if (error instanceof multer.MulterError) {
            const message = error.code === "LIMIT_FILE_SIZE"
                ? "Image must be 2MB or less"
                : error.message;
            return next(new HttpAppError(message, 400, {}, error.code));
        }
        next(error);
    });
};

// use it in a route:  uploadProfilePicture  (form-data key: image)
export const uploadProfilePicture = [uploadSingleImage, checkMagicNumbers];
