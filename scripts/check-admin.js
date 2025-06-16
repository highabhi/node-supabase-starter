const dbConfig = require('../database/config-fallback');

async function checkAdmin() {
  try {
    // Initialize database connection
    const pool = await dbConfig.initializeDatabase();
    
    console.log('Checking for admin users in the database...');
    
    // Query for admin users
    const result = await pool.query(
      'SELECT id, email, role, is_active, created_at FROM users WHERE role = $1', 
      ['super_admin']
    );
    
    if (result.rows.length > 0) {
      console.log('Found admin users:');
      result.rows.forEach(user => {
        console.log(`- ID: ${user.id}, Email: ${user.email}, Role: ${user.role}, Active: ${user.is_active}, Created: ${user.created_at}`);
      });
    } else {
      console.log('No admin users found in the database.');
    }
    
    // Check total users count
    const countResult = await pool.query('SELECT COUNT(*) FROM users');
    console.log(`Total users in database: ${countResult.rows[0].count}`);
    
    // Close the connection
    console.log('Database check complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error checking admin users:', error);
    process.exit(1);
  }
}

checkAdmin();
