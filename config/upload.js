// Profile image upload for Volunteers (stored in public/uploads).
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const dir = path.join(__dirname, '..', 'public', 'uploads');
fs.mkdirSync(dir, { recursive: true });

module.exports = multer({
  storage: multer.diskStorage({
    destination: dir,
    filename: (req, file, cb) =>
      cb(null, crypto.randomBytes(12).toString('hex') + path.extname(file.originalname).toLowerCase()),
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    cb(null, /\.(png|jpe?g|gif|webp)$/i.test(file.originalname) && /^image\//.test(file.mimetype)),
});
