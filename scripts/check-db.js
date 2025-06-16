require('dotenv').config();
const { Pool } = require('pg');

async function checkDatabase() {
  try {
    console.log('Testing database connection...');
    
    // Connect directly to Supabase with minimal configuration
    const pool = new Pool({
      connectionString: process.env.DB_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    // Test connection
    const client = await pool.connect();
    console.log('✅ Connected to database');
    
    // Check users table
    const result = await client.query('SELECT id, email, role, is_active FROM users');
    
    console.log(`Found ${result.rows.length} users in the database:`);
    result.rows.forEach(user => {
      console.log(`- ID: ${user.id}, Email: ${user.email}, Role: ${user.role}, Active: ${user.is_active}`);
    });
    
    client.release();
    await pool.end();
    
    console.log('Database check complete');
  } catch (error) {
    console.error('Error connecting to database:', error.message);
  }
}

checkDatabase();
