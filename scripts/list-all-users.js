require('dotenv').config();
const dbConfig = require('../database/config-fallback');

async function listAllUsers() {
  try {
    // Initialize database connection
    const pool = await dbConfig.initializeDatabase();
    console.log('Connected to database');
    
    // Query all users with detailed information
    const result = await pool.query(`
      SELECT 
        id, 
        email, 
        role, 
        is_active, 
        created_at, 
        updated_at, 
        last_login 
      FROM users
      ORDER BY created_at DESC
    `);
    
    if (result.rows.length > 0) {
      console.log(`\n=== Found ${result.rows.length} users in the database: ===\n`);
      
      result.rows.forEach((user, index) => {
        console.log(`User #${index + 1}:`);
        console.log(`  ID: ${user.id}`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Role: ${user.role}`);
        console.log(`  Active: ${user.is_active ? 'Yes' : 'No'}`);
        console.log(`  Created: ${user.created_at}`);
        console.log(`  Updated: ${user.updated_at || 'Never'}`);
        console.log(`  Last Login: ${user.last_login || 'Never'}`);
        console.log('');
      });
    } else {
      console.log('No users found in the database.');
    }
    
    console.log('Database query complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error listing users:', error);
    process.exit(1);
  }
}

listAllUsers();
