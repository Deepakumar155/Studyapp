const express = require('express');
const router = express.Router();
const {
  createNote,
  getNotes,
  updateNote,
  deleteNote,
} = require('../controllers/noteController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, createNote)
  .get(protect, getNotes);

router.route('/:id')
  .put(protect, updateNote)
  .delete(protect, deleteNote);

module.exports = router;
