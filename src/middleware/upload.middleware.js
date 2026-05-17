const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Faqat JPEG, PNG va WebP formatdagi rasmlar qabul qilinadi'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024,
    files: 10
  }
});

const processImage = async (buffer, outputPath, options = {}) => {
  const {
    width = 800,
    height = null,
    quality = 80,
    format = 'webp'
  } = options;

  let processor = sharp(buffer).rotate();

  if (width || height) {
    processor = processor.resize(width, height, {
      fit: 'inside',
      withoutEnlargement: true
    });
  }

  if (format === 'webp') {
    processor = processor.webp({ quality });
  } else if (format === 'jpeg') {
    processor = processor.jpeg({ quality });
  } else {
    processor = processor.png({ quality });
  }

  await processor.toFile(outputPath);
};

const handleUpload = (folder, options = {}) => async (req, res, next) => {
  try {
    if (!req.files && !req.file) return next();

    const uploadDir = path.join(process.cwd(), 'uploads', folder);
    ensureDir(uploadDir);

    const processFile = async (file) => {
      const filename = `${uuidv4()}.webp`;
      const filePath = path.join(uploadDir, filename);
      await processImage(file.buffer, filePath, options);
      return `/uploads/${folder}/${filename}`;
    };

    if (req.files && Array.isArray(req.files)) {
      req.uploadedFiles = await Promise.all(req.files.map(processFile));
    } else if (req.files && typeof req.files === 'object') {
      req.uploadedFiles = {};
      for (const [key, files] of Object.entries(req.files)) {
        req.uploadedFiles[key] = await Promise.all(files.map(processFile));
      }
    } else if (req.file) {
      req.uploadedFile = await processFile(req.file);
    }

    next();
  } catch (error) {
    next(error);
  }
};

const uploadSingle = (field, folder, options) => [
  upload.single(field),
  handleUpload(folder, options)
];

const uploadMultiple = (field, folder, maxCount = 10, options) => [
  upload.array(field, maxCount),
  handleUpload(folder, options)
];

const uploadFields = (fields, folder, options) => [
  upload.fields(fields),
  handleUpload(folder, options)
];

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  uploadFields,
  handleUpload
};
