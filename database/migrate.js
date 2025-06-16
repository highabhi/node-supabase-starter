const fs = require('fs');
const path = require('path');
const dbConfig = require('./config-fallback');
const bcrypt = require('bcryptjs'); 
require('dotenv').config();

async function runMigration() {
    try {
        console.log('Starting database migration...');
        
        // Initialize the database connection
        const pool = await dbConfig.initializeDatabase();
        const dbInfo = dbConfig.getDbInfo();
        console.log(`Using ${dbInfo.type} database for migration`);

        if (dbInfo.isSQLite) {
            // SQLite version
            console.log('Creating SQLite database schema...');
            
            // Create users table
            await pool.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    role TEXT NOT NULL DEFAULT 'moderator' CHECK (role IN ('super_admin', 'admin', 'moderator')),
                    is_active INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_by INTEGER,
                    last_login TIMESTAMP
                );
            `);

            // Create indexes
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);`);
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);`);
            
            // Create triggers for updated_at
            await pool.query(`
                CREATE TRIGGER IF NOT EXISTS update_users_updated_at
                AFTER UPDATE ON users
                BEGIN
                    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
                END;
            `);
        } else {
            // PostgreSQL version - use the schema directly
            const schemaPath = path.join(__dirname, 'schema.sql');
            const schema = fs.readFileSync(schemaPath, 'utf8');
            await pool.query(schema);
        }

        //create super admin if it doesn't exist
        await createSuperAdmin();
        console.log('Migration completed successfully');
        process.exit(0);
    } catch (error) {
        console.error("Migration failed: ", error)
        process.exit(1);
    }
}

async function createSuperAdmin() {
    try {
        const pool = dbConfig.pool;
        const dbInfo = dbConfig.getDbInfo();
        const email = process.env.SUPER_ADMIN_EMAIL;
        const password = process.env.SUPER_ADMIN_PASSWORD;

        if (!email || !password) {
            console.error("Missing email or password in .env file.");
            return;
        }
        
        // Check if super admin already exists
        let adminExists = false;
        
        if (dbInfo.isSQLite) {
            const result = await pool.query(
                'SELECT COUNT(*) as count FROM users WHERE email = ? AND role = ?',
                [email, 'super_admin']
            );
            adminExists = result.rows[0].count > 0;
        } else {
            const result = await pool.query(
                'SELECT id FROM users WHERE email = $1 AND role = $2',
                [email, 'super_admin']
            );
            adminExists = result.rows.length > 0;
        }

        if (adminExists) {
            console.log("Admin account already exists.");
            return;
        }
        
        // Hash password and create super admin
        const hashedPassword = await bcrypt.hash(password, 12);

        if (dbInfo.isSQLite) {
            await pool.query(
                'INSERT INTO users (email, password, role, is_active) VALUES (?, ?, ?, ?)',
                [email, hashedPassword, 'super_admin', 1]
            );
        } else {
            await pool.query(
                'INSERT INTO users (email, password, role) VALUES ($1, $2, $3)',
                [email, hashedPassword, 'super_admin']
            );
        }

        console.log("Super admin created successfully");
        console.log(`Email: ${email}`);
    } catch (error) {
        console.error("Error creating super admin:", error);
    }
}

// Run the migration when this script is executed directly
if (require.main === module) {
    runMigration();
}

module.exports = { runMigration };