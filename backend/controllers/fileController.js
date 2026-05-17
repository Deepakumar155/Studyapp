const { db } = require('../config/db');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Helper to ensure uploads folder exists
const ensureUploadsDir = () => {
  const uploadsDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  return uploadsDir;
};

// @desc    Upload a file
// @route   POST /api/files
// @access  Private
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { title, folderId } = req.body;
    const cleanFolderId = folderId || null;
    const userId = req.user._id;

    // Create unique filename
    const filename = `${Date.now()}-${req.file.originalname}`;
    
    // Save file buffer to local disk
    const uploadsDir = ensureUploadsDir();
    fs.writeFileSync(path.join(uploadsDir, filename), req.file.buffer);

    // Create file record in Turso
    const fileId = crypto.randomUUID();
    const fileUrl = `/api/files/stream/${fileId}`;
    const fileTitle = title || req.file.originalname;

    await db.execute({
      sql: 'INSERT INTO files (id, title, fileUrl, fileType, size, folderId, uploadedBy, publicId) VALUES (?, ?, ?, ?, ?, ?, ?, ?);',
      args: [fileId, fileTitle, fileUrl, req.file.mimetype, req.file.size, cleanFolderId, userId, filename]
    });

    const rs = await db.execute({
      sql: 'SELECT id AS _id, title, fileUrl, fileType, size, folderId, uploadedBy, publicId, createdAt FROM files WHERE id = ?;',
      args: [fileId]
    });

    res.status(201).json(rs.rows[0]);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get files for a folder (or all for user)
// @route   GET /api/files
// @access  Private
const getFiles = async (req, res) => {
  const { folderId } = req.query;
  const userId = req.user._id;

  try {
    let rs;
    if (req.query.all === 'true') {
      rs = await db.execute({
        sql: 'SELECT id AS _id, title, fileUrl, fileType, size, folderId, uploadedBy, publicId, createdAt FROM files WHERE uploadedBy = ? ORDER BY createdAt DESC;',
        args: [userId]
      });
    } else if (folderId) {
      rs = await db.execute({
        sql: 'SELECT id AS _id, title, fileUrl, fileType, size, folderId, uploadedBy, publicId, createdAt FROM files WHERE uploadedBy = ? AND folderId = ? ORDER BY createdAt DESC;',
        args: [userId, folderId]
      });
    } else {
      rs = await db.execute({
        sql: 'SELECT id AS _id, title, fileUrl, fileType, size, folderId, uploadedBy, publicId, createdAt FROM files WHERE uploadedBy = ? AND folderId IS NULL ORDER BY createdAt DESC;',
        args: [userId]
      });
    }

    res.json(rs.rows);
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a file
// @route   DELETE /api/files/:id
// @access  Private
const deleteFile = async (req, res) => {
  const fileId = req.params.id;
  const userId = req.user._id;

  try {
    const rs = await db.execute({
      sql: 'SELECT * FROM files WHERE id = ? AND uploadedBy = ?;',
      args: [fileId, userId]
    });

    if (rs.rows.length === 0) {
      return res.status(404).json({ message: 'File not found' });
    }

    const file = rs.rows[0];

    // Delete physical file from local disk
    const filePath = path.join(__dirname, '../uploads', file.publicId);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error(`Failed to delete local file ${filePath}:`, err);
      }
    }

    // Delete record from database
    await db.execute({
      sql: 'DELETE FROM files WHERE id = ? AND uploadedBy = ?;',
      args: [fileId, userId]
    });

    res.json({ message: 'File removed' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get storage statistics
// @route   GET /api/files/stats/storage
// @access  Private
const getStorageStats = async (req, res) => {
  const userId = req.user._id;

  try {
    const rs = await db.execute({
      sql: 'SELECT SUM(size) AS totalUsed FROM files WHERE uploadedBy = ?;',
      args: [userId]
    });

    const totalUsed = rs.rows[0].totalUsed || 0;
    const totalCapacity = 512 * 1024 * 1024; // 512MB (Standard Free Tier Capacity)

    res.json({
      used: totalUsed,
      total: totalCapacity,
      available: Math.max(0, totalCapacity - totalUsed),
      percentage: totalCapacity > 0 ? (totalUsed / totalCapacity) * 100 : 0,
    });
  } catch (error) {
    console.error('Get storage stats error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Stream file from disk
// @route   GET /api/files/stream/:id
// @access  Public
const getFileStream = async (req, res) => {
  const fileId = req.params.id;

  try {
    const rs = await db.execute({
      sql: 'SELECT * FROM files WHERE id = ?;',
      args: [fileId]
    });

    if (rs.rows.length === 0) {
      return res.status(404).json({ message: 'File not found' });
    }

    const file = rs.rows[0];
    const filePath = path.join(__dirname, '../uploads', file.publicId);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Physical file not found on disk' });
    }

    res.set('Content-Type', file.fileType);
    res.set('Content-Disposition', `inline; filename="${file.title}"`);
    
    res.sendFile(filePath);
  } catch (error) {
    console.error('Stream file error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  uploadFile,
  getFiles,
  deleteFile,
  getStorageStats,
  getFileStream,
};
