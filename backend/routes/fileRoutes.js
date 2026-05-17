const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadFile, getFiles, deleteFile, getStorageStats, getFileStream } = require('../controllers/fileController');
const { protect } = require('../middleware/authMiddleware');
require('dotenv').config();

// Use memory storage to handle GridFS manually in the controller
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.route('/')
  .post(protect, upload.single('file'), uploadFile)
  .get(protect, getFiles);

router.get('/stats/storage', protect, getStorageStats);

router.get('/stream/:id', getFileStream); // Publicly accessible or protected? Usually better to protect but depends on usage.

router.delete('/:id', protect, deleteFile);

module.exports = router;
