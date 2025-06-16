require('dotenv').config();
const dbConfig = require('./config-fallback');

async function testFallback() {
  try {
    console.log('Testing database connection with SQLite fallback...');
    console.log('dbConfig:', Object.keys(dbConfig));
    
    // Initialize the database (will fallback to SQLite if PostgreSQL fails)
    const pool = await dbConfig.initializeDatabase();
    
    // Get info about which database type we're using
    const dbInfo = dbConfig.getDbInfo();
    console.log(`Using ${dbInfo.type} database`);
    
    // Test a simple query
    const result = await pool.query('SELECT 1 as test');
    console.log('Query result:', result.rows);
    
    console.log('Database connection test completed successfully');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testFallback();
