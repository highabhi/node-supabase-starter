require('dotenv').config();
const { Pool } = require('pg');

async function testConnection() {
  console.log('Testing database connection...');
  console.log(`DB_URL from env: ${process.env.DB_URL ? 'Exists (not showing for security)' : 'MISSING!'}`);
  
  if (!process.env.DB_URL) {
    console.error('DB_URL is missing in .env file');
    return;
  }
  
  // Just print the first few characters of the URL for debugging (safely)
  const urlPrefix = process.env.DB_URL.substring(0, 20) + '...';
  console.log(`DB_URL prefix: ${urlPrefix}`);

  // Extract host from connection string for diagnostics
  const connectionString = process.env.DB_URL;
  let host = 'unknown';
  try {
    const regex = /postgresql:\/\/.*?@([^:]+):/;
    const match = connectionString.match(regex);
    if (match && match[1]) {
      host = match[1];
      console.log(`Extracted host: ${host}`);
    } else {
      console.log('Could not extract host from connection string. Format may be incorrect.');
    }
  } catch (err) {
    console.error('Failed to parse host from connection string:', err.message);
  }

  console.log(`Attempting to connect to: ${host}`);

  // Try connecting
  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 5000,
  });

  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    console.log('✅ Successfully connected to database!');
    
    // Test query
    const result = await client.query('SELECT current_timestamp');
    console.log(`Server time: ${result.rows[0].current_timestamp}`);
    
    client.release();
    await pool.end();
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    
    if (err.message.includes('ENOTFOUND')) {
      console.error('\n📋 Troubleshooting steps:');
      console.error('1. Check if your Supabase project still exists');
      console.error('2. Verify your DB_URL in .env file is up-to-date');
      console.error('3. Create a new Supabase project if needed and update your credentials');
    }
  }
}

testConnection();
