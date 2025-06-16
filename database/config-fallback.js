const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Flag to track database mode (PostgreSQL or SQLite)
let usingSQLite = false;
let pool = null;
let sqlite = null;

// Create database directory if it doesn't exist
const dbDir = path.join(__dirname, 'sqlite');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Setup SQLite database
function setupSQLite() {
  try {
    console.log('Falling back to SQLite database for local development...');
    
    const Database = require('better-sqlite3');
    const dbPath = path.join(__dirname, 'sqlite', 'local.db');
    
    sqlite = new Database(dbPath, { verbose: console.log });
    
    // Create a mock pool interface that uses SQLite underneath
    pool = {
      query: async (text, params = []) => {
        try {
          // Convert PostgreSQL queries to SQLite format (basic conversion)
          let sqliteText = text
            .replace(/\$(\d+)/g, '?') // Convert $1, $2 to ?
            .replace(/SERIAL PRIMARY KEY/g, 'INTEGER PRIMARY KEY AUTOINCREMENT')
            .replace(/RETURNING \*/g, '') // SQLite doesn't support RETURNING
            .replace(/NOW\(\)/g, "datetime('now')"); // Convert NOW() to SQLite's datetime
            
          if (text.trim().toUpperCase().startsWith('SELECT')) {
            // For SELECT queries
            const stmt = sqlite.prepare(sqliteText);
            const rows = stmt.all(...params);
            return { rows, rowCount: rows.length };
          } else if (text.trim().toUpperCase().startsWith('INSERT')) {
            // For INSERT queries
            const stmt = sqlite.prepare(sqliteText);
            const result = stmt.run(...params);
            
            // If this was an INSERT with RETURNING, manually fetch the last inserted row
            if (text.includes('RETURNING')) {
              const lastId = result.lastInsertRowid;
              const tableName = text.match(/INTO\s+(\w+)/i)?.[1];
              
              if (tableName && lastId) {
                const selectStmt = sqlite.prepare(`SELECT * FROM ${tableName} WHERE rowid = ?`);
                const rows = [selectStmt.get(lastId)];
                return { rows, rowCount: rows.length };
              }
            }
            
            return { rowCount: result.changes };
          } else {
            // For UPDATE, DELETE, etc.
            const stmt = sqlite.prepare(sqliteText);
            const result = stmt.run(...params);
            return { rowCount: result.changes };
          }
        } catch (err) {
          console.error('SQLite query error:', err);
          throw err;
        }
      },
      connect: async () => {
        return {
          query: async (text, params = []) => {
            const result = await pool.query(text, params);
            return result;
          },
          release: () => {}
        };
      },
      end: async () => {
        if (sqlite) {
          sqlite.close();
        }
      }
    };
    
    usingSQLite = true;
    console.log('✅ SQLite database initialized successfully');
    console.log(`📁 Database file: ${dbPath}`);
    
    return pool;
  } catch (error) {
    console.error('Failed to initialize SQLite:', error);
    throw error;
  }
}

// Try to connect to PostgreSQL first
async function initializeDatabase() {
  if (process.env.DB_URL) {
    try {
      console.log('Attempting to connect to PostgreSQL database...');
      
      // Supabase connection configuration
      pool = new Pool({
        connectionString: process.env.DB_URL,
        ssl: {
          rejectUnauthorized: false
        },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
      
      // Test the connection
      const client = await pool.connect();
      console.log('✅ PostgreSQL database connected successfully');
      client.release();
      
      return pool;
    } catch (error) {
      console.error('❌ PostgreSQL connection failed:', error.message);
      console.log('Falling back to SQLite...');
      
      return setupSQLite();
    }
  } else {
    console.log('No PostgreSQL connection string found in environment variables.');
    return setupSQLite();
  }
}

// Export information about the database mode
const getDbInfo = () => ({
  isSQLite: usingSQLite,
  type: usingSQLite ? 'SQLite' : 'PostgreSQL'
});

module.exports = {
  initializeDatabase,
  getDbInfo,
  // This allows code to reference the pool directly
  // but it will be initialized only when needed
  get pool() {
    if (!pool) {
      throw new Error('Database not initialized. Call initializeDatabase() first.');
    }
    return pool;
  }
};
