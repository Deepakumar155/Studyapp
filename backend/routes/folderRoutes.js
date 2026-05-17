const express = require('express');
const router = express.Router();
const {
  createFolder,
  getFolders,
  getFolderById,
  updateFolder,
  deleteFolder,
  downloadFolder,
} = require('../controllers/folderController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, createFolder)
  .get(protect, getFolders);

router.route('/:id')
  .get(protect, getFolderById)
  .put(protect, updateFolder)
  .delete(protect, deleteFolder);

router.get('/:id/download', protect, downloadFolder);

module.exports = router;
