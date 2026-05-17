const { createClient } = require('@libsql/client');
const dotenv = require('dotenv');
dotenv.config();

let url = process.env.TURSO_DB_URL || 'file:studyvault.db';
let authToken = process.env.TURSO_DB_AUTH_TOKEN || '';

// If the token is still the default placeholder, treat it as empty
if (authToken === 'your_turso_auth_token_here') {
  authToken = '';
}

console.log(`Connecting to database at ${url}`);
let db = createClient({
  url: url,
  authToken: authToken,
});

const initializeTables = async (clientInstance) => {
  // 1. Users Table
  await clientInstance.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Folders Table
  await clientInstance.execute(`
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      folderName TEXT NOT NULL,
      parentFolder TEXT DEFAULT NULL,
      createdBy TEXT NOT NULL,
      color TEXT DEFAULT '#4F46E5',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parentFolder) REFERENCES folders(id) ON DELETE CASCADE,
      FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 3. Notes Table
  await clientInstance.execute(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      folderId TEXT DEFAULT NULL,
      createdBy TEXT NOT NULL,
      isPinned INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (folderId) REFERENCES folders(id) ON DELETE CASCADE,
      FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 4. Files Table
  await clientInstance.execute(`
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      fileUrl TEXT NOT NULL,
      fileType TEXT NOT NULL,
      size INTEGER,
      folderId TEXT DEFAULT NULL,
      uploadedBy TEXT NOT NULL,
      publicId TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (folderId) REFERENCES folders(id) ON DELETE CASCADE,
      FOREIGN KEY (uploadedBy) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
};

const initializeDatabase = async () => {
  try {
    // Attempt to initialize using the configured connection (e.g. Turso Cloud)
    await initializeTables(db);
    console.log('SQL Database tables initialized successfully.');
  } catch (error) {
    // Check if it's an authorization/token error or server error
    if (url.startsWith('libsql://') && (error.message.includes('401') || error.message.includes('UNAUTHORIZED') || error.message.includes('SERVER_ERROR'))) {
      console.warn('⚠️ Remote Turso DB connection unauthorized or failed. Falling back to a local SQLite database (studyvault.db) for development...');
      
      // Re-create the client with local SQLite
      url = 'file:studyvault.db';
      authToken = '';
      db = createClient({
        url: url,
      });

      try {
        await initializeTables(db);
        console.log('Local SQLite Database tables initialized successfully.');
      } catch (localError) {
        console.error('❌ Failed to initialize local SQLite fallback database:', localError);
        throw localError;
      }
    } else {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }
};

// Export both the db connection wrapper and initialization function.
// Using a proxy or getter for db ensures that if db is re-assigned to the local fallback,
// imports in other files will reference the active connection!
module.exports = {
  get db() {
    return db;
  },
  initializeDatabase,
};
