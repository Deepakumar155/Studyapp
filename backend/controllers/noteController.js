const { db } = require('../config/db');
const crypto = require('crypto');

// Helper to convert SQLite numeric booleans to JS Booleans
const mapNote = (note) => {
  if (!note) return null;
  return {
    ...note,
    isPinned: Boolean(note.isPinned),
  };
};

// @desc    Create a new note
// @route   POST /api/notes
// @access  Private
const createNote = async (req, res) => {
  const { title, content, folderId } = req.body;

  if (!title) {
    return res.status(400).json({ message: 'Note title is required' });
  }

  try {
    const noteId = crypto.randomUUID();
    const cleanFolderId = folderId || null;
    const cleanContent = content || '';
    const userId = req.user._id;

    await db.execute({
      sql: 'INSERT INTO notes (id, title, content, folderId, createdBy) VALUES (?, ?, ?, ?, ?);',
      args: [noteId, title, cleanContent, cleanFolderId, userId]
    });

    const rs = await db.execute({
      sql: 'SELECT id AS _id, title, content, folderId, createdBy, isPinned, createdAt, updatedAt FROM notes WHERE id = ?;',
      args: [noteId]
    });

    res.status(201).json(mapNote(rs.rows[0]));
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get notes for a folder (or all for user)
// @route   GET /api/notes
// @access  Private
const getNotes = async (req, res) => {
  const { folderId } = req.query;
  const userId = req.user._id;

  try {
    let rs;
    if (folderId) {
      rs = await db.execute({
        sql: 'SELECT id AS _id, title, content, folderId, createdBy, isPinned, createdAt, updatedAt FROM notes WHERE createdBy = ? AND folderId = ? ORDER BY updatedAt DESC;',
        args: [userId, folderId]
      });
    } else {
      rs = await db.execute({
        sql: 'SELECT id AS _id, title, content, folderId, createdBy, isPinned, createdAt, updatedAt FROM notes WHERE createdBy = ? AND folderId IS NULL ORDER BY updatedAt DESC;',
        args: [userId]
      });
    }

    res.json(rs.rows.map(mapNote));
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a note
// @route   PUT /api/notes/:id
// @access  Private
const updateNote = async (req, res) => {
  const { title, content, isPinned } = req.body;
  const noteId = req.params.id;
  const userId = req.user._id;

  try {
    // Check if note exists and belongs to user
    const checkRs = await db.execute({
      sql: 'SELECT * FROM notes WHERE id = ? AND createdBy = ?;',
      args: [noteId, userId]
    });

    if (checkRs.rows.length === 0) {
      return res.status(404).json({ message: 'Note not found' });
    }

    const currentNote = checkRs.rows[0];
    const updatedTitle = title !== undefined ? title : currentNote.title;
    const updatedContent = content !== undefined ? content : currentNote.content;
    
    let updatedIsPinned = currentNote.isPinned;
    if (isPinned !== undefined) {
      updatedIsPinned = isPinned ? 1 : 0;
    }

    await db.execute({
      sql: 'UPDATE notes SET title = ?, content = ?, isPinned = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND createdBy = ?;',
      args: [updatedTitle, updatedContent, updatedIsPinned, noteId, userId]
    });

    const rs = await db.execute({
      sql: 'SELECT id AS _id, title, content, folderId, createdBy, isPinned, createdAt, updatedAt FROM notes WHERE id = ?;',
      args: [noteId]
    });

    res.json(mapNote(rs.rows[0]));
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a note
// @route   DELETE /api/notes/:id
// @access  Private
const deleteNote = async (req, res) => {
  const noteId = req.params.id;
  const userId = req.user._id;

  try {
    const checkRs = await db.execute({
      sql: 'SELECT 1 FROM notes WHERE id = ? AND createdBy = ?;',
      args: [noteId, userId]
    });

    if (checkRs.rows.length === 0) {
      return res.status(404).json({ message: 'Note not found' });
    }

    await db.execute({
      sql: 'DELETE FROM notes WHERE id = ? AND createdBy = ?;',
      args: [noteId, userId]
    });

    res.json({ message: 'Note removed' });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createNote,
  getNotes,
  updateNote,
  deleteNote,
};
