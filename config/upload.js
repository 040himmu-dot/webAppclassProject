
// Handles profile image uploads for volunteers.
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// Set the folder where uploaded images will be saved.
const dir = path.join(__dirname, '..', 'public', 'uploads');

// Create the uploads folder if it doesn't already exist.
fs.mkdirSync(dir, { recursive: true });

// Configure how profile images are uploaded.
module.exports = multer({
  storage: multer.diskStorage({
    // Save uploaded images in the uploads folder.
    destination: dir,

    // Give each image a random filename to avoid duplicate names.
    filename: (req, file, cb) =>
      cb(null, crypto.randomBytes(12).toString('hex') + path.extname(file.originalname).toLowerCase()),
  }),

  // Limit uploaded images to 2 MB.
  limits: { fileSize: 2 * 1024 * 1024 },

  // Only allow supported image formats.
  fileFilter: (req, file, cb) =>
    cb(null, /\.(png|jpe?g|gif|webp)$/i.test(file.originalname) && /^image\//.test(file.mimetype)),
});
