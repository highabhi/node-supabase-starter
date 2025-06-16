const { Pool } = require('pg');

// Function to test database connection
async function testDatabaseConnection() {
    // Parse the connection string
    const connectionString = 'postgresql://postgres:makichutaisepyarki@db.hijewgxuhnrdonokfmym.supabase.co:5432/postgres';
    
    // Create a connection pool
    const pool = new Pool({ connectionString });
    
    try {
        // Attempt to connect and run a simple query
        const client = await pool.connect();
        console.log('Successfully connected to the database!');
        
        // Run a simple query to further verify the connection
        const result = await client.query('SELECT NOW()');
        console.log('Database time:', result.rows[0].now);
        
        // Release the client back to the pool
        client.release();
        
        // Close the pool
        await pool.end();
        
        return true;
    } catch (error) {
        console.error('Error connecting to the database:', error.message);
        return false;
    }
}

// Call the function
testDatabaseConnection()
    .then(success => {
        if (success) {
            console.log('Database connection test completed successfully.');
        } else {
            console.log('Database connection test failed.');
        }
    });
