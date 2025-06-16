const { Pool } = require('pg');
require('dotenv').config();

// Validate DB URL before proceeding
if (!process.env.DB_URL) {
    console.error('❌ DB_URL is missing in .env file. Please add a valid Supabase connection string.');
    console.error('📋 Format: postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres');
    process.exit(1);
}

// Supabase connection configuration
const pool = new Pool({
    connectionString: process.env.DB_URL,
    ssl: {
        rejectUnauthorized: false
    },
    // Supabase specific settings
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test database connection with better error handling
const testConnection = async () => {
    try {
        const client = await pool.connect();
        console.log('✅ Database connected successfully to Supabase');

        // Test a simple query
        const result = await client.query('SELECT NOW()');
        console.log('📅 Database time:', result.rows[0].now);

        client.release();
    } catch (err) {
        console.error('❌ Error connecting to Supabase database:');
        console.error('   Message:', err.message);
        console.error('   Code:', err.code);

        if (err.message.includes('password authentication failed')) {
            console.error('🔑 Check your database password in .env file');
        } else if (err.message.includes('database') && err.message.includes('does not exist')) {
            console.error('🗄️  Check your database name in .env file');
        } else if (err.message.includes('getaddrinfo ENOTFOUND')) {
            console.error('🌐 Check your database host/URL in .env file');
        }

        console.error('\n📋 Please verify your Supabase credentials:');
        console.error('   - Go to your Supabase project dashboard');
        console.error('   - Settings → Database → Connection string');
        console.error('   - Copy the connection string and update DB_URL in .env');
    }
};

// Test connection on startup
testConnection();

module.exports = pool;