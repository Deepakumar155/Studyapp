const { db } = require('../config/db');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const crypto = require('crypto');

// @desc    Create a new folder
// @route   POST /api/folders
// @access  Private
const createFolder = async (req, res) => {
  const { folderName, parentFolder, color } = req.body;

  if (!folderName) {
    return res.status(400).json({ message: 'Folder name is required' });
  }

  try {
    const folderId = crypto.randomUUID();
    const cleanParentFolder = parentFolder || null;
    const cleanColor = color || '#4F46E5';
    const userId = req.user._id;

    await db.execute({
      sql: 'INSERT INTO folders (id, folderName, parentFolder, createdBy, color) VALUES (?, ?, ?, ?, ?);',
      args: [folderId, folderName, cleanParentFolder, userId, cleanColor]
    });

    const rs = await db.execute({
      sql: 'SELECT id AS _id, folderName, parentFolder, createdBy, color, createdAt FROM folders WHERE id = ?;',
      args: [folderId]
    });

    res.status(201).json(rs.rows[0]);
  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all folders for a user (or subfolders of a specific folder)
// @route   GET /api/folders
// @access  Private
const getFolders = async (req, res) => {
  const { parentId, all } = req.query;
  const userId = req.user._id;

  try {
    let rs;
    if (all === 'true') {
      rs = await db.execute({
        sql: 'SELECT id AS _id, folderName, parentFolder, createdBy, color, createdAt, (SELECT COUNT(*) FROM files WHERE folderId = folders.id) AS fileCount FROM folders WHERE createdBy = ? ORDER BY folderName ASC;',
        args: [userId]
      });
    } else if (parentId) {
      rs = await db.execute({
        sql: 'SELECT id AS _id, folderName, parentFolder, createdBy, color, createdAt, (SELECT COUNT(*) FROM files WHERE folderId = folders.id) AS fileCount FROM folders WHERE createdBy = ? AND parentFolder = ? ORDER BY folderName ASC;',
        args: [userId, parentId]
      });
    } else {
      rs = await db.execute({
        sql: 'SELECT id AS _id, folderName, parentFolder, createdBy, color, createdAt, (SELECT COUNT(*) FROM files WHERE folderId = folders.id) AS fileCount FROM folders WHERE createdBy = ? AND parentFolder IS NULL ORDER BY folderName ASC;',
        args: [userId]
      });
    }

    res.json(rs.rows);
  } catch (error) {
    console.error('Get folders error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a single folder by ID
// @route   GET /api/folders/:id
// @access  Private
const getFolderById = async (req, res) => {
  const folderId = req.params.id;
  const userId = req.user._id;

  try {
    const rs = await db.execute({
      sql: 'SELECT id AS _id, folderName, parentFolder, createdBy, color, createdAt, (SELECT COUNT(*) FROM files WHERE folderId = folders.id) AS fileCount FROM folders WHERE id = ? AND createdBy = ?;',
      args: [folderId, userId]
    });

    if (rs.rows.length > 0) {
      res.json(rs.rows[0]);
    } else {
      res.status(404).json({ message: 'Folder not found' });
    }
  } catch (error) {
    console.error('Get folder error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a folder
// @route   PUT /api/folders/:id
// @access  Private
const updateFolder = async (req, res) => {
  const { folderName, color } = req.body;
  const folderId = req.params.id;
  const userId = req.user._id;

  try {
    const checkRs = await db.execute({
      sql: 'SELECT * FROM folders WHERE id = ? AND createdBy = ?;',
      args: [folderId, userId]
    });

    if (checkRs.rows.length === 0) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    const currentFolder = checkRs.rows[0];
    const updatedName = folderName || currentFolder.folderName;
    const updatedColor = color || currentFolder.color;

    await db.execute({
      sql: 'UPDATE folders SET folderName = ?, color = ? WHERE id = ? AND createdBy = ?;',
      args: [updatedName, updatedColor, folderId, userId]
    });

    const rs = await db.execute({
      sql: 'SELECT id AS _id, folderName, parentFolder, createdBy, color, createdAt FROM folders WHERE id = ? AND createdBy = ?;',
      args: [folderId, userId]
    });

    res.json(rs.rows[0]);
  } catch (error) {
    console.error('Update folder error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a folder
// @route   DELETE /api/folders/:id
// @access  Private
const deleteFolder = async (req, res) => {
  const folderId = req.params.id;
  const userId = req.user._id;

  try {
    const checkRs = await db.execute({
      sql: 'SELECT 1 FROM folders WHERE id = ? AND createdBy = ?;',
      args: [folderId, userId]
    });

    if (checkRs.rows.length === 0) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    // In SQL databases, if foreign key constraints are set to ON DELETE CASCADE,
    // deleting a folder automatically cascades and deletes all subfolders, notes, and files.
    // However, we should also delete the actual physical files from the local disk!
    const filesToClean = await getFolderContents(folderId, userId, '');
    for (const file of filesToClean) {
      const filePath = path.join(__dirname, '../uploads', file.publicId);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.error(`Failed to delete local file ${filePath}:`, err);
        }
      }
    }

    await db.execute({
      sql: 'DELETE FROM folders WHERE id = ? AND createdBy = ?;',
      args: [folderId, userId]
    });

    res.json({ message: 'Folder removed' });
  } catch (error) {
    console.error('Delete folder error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Recursive function to get files
const getFolderContents = async (folderId, userId, basePath = '') => {
  let filesToZip = [];
  
  // Get files in current folder
  const filesRs = await db.execute({
    sql: 'SELECT id AS _id, title, publicId FROM files WHERE folderId = ? AND uploadedBy = ?;',
    args: [folderId, userId]
  });

  for (const file of filesRs.rows) {
     filesToZip.push({
        publicId: file.publicId,
        name: path.join(basePath, file.title)
     });
  }

  // Get subfolders
  const subfoldersRs = await db.execute({
    sql: 'SELECT id AS _id, folderName FROM folders WHERE parentFolder = ? AND createdBy = ?;',
    args: [folderId, userId]
  });

  for (const sub of subfoldersRs.rows) {
      const subContents = await getFolderContents(sub._id, userId, path.join(basePath, sub.folderName));
      filesToZip = filesToZip.concat(subContents);
  }

  return filesToZip;
};

// @desc    Download folder as zip
// @route   GET /api/folders/:id/download
// @access  Private
const downloadFolder = async (req, res) => {
  const folderId = req.params.id;
  const userId = req.user._id;

  try {
    const rs = await db.execute({
      sql: 'SELECT id AS _id, folderName FROM folders WHERE id = ? AND createdBy = ?;',
      args: [folderId, userId]
    });

    if (rs.rows.length === 0) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    const folder = rs.rows[0];
    const filesToZip = await getFolderContents(folderId, userId, folder.folderName);
    
    res.attachment(`${folder.folderName}.zip`);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    archive.on('error', (err) => { throw err; });
    archive.pipe(res);

    // Append physical files from local server disk
    for (const file of filesToZip) {
      const filePath = path.join(__dirname, '../uploads', file.publicId);
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: file.name });
      }
    }

    archive.finalize();
  } catch (error) {
    console.error('Download folder error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createFolder,
  getFolders,
  getFolderById,
  updateFolder,
  deleteFolder,
  downloadFolder,
};
