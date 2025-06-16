const dbConfig = require('./config-fallback');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

async function initializeDatabase() {
  try {
    console.log('Checking database tables...');
    const pool = dbConfig.pool;
    const dbInfo = dbConfig.getDbInfo();
    
    let tableExists = false;

    // Check if users table exists - with support for both PostgreSQL and SQLite
    if (dbInfo.isSQLite) {
      // SQLite syntax
      const tableCheck = await pool.query(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='users';
      `);
      tableExists = tableCheck.rows.length > 0;
    } else {
      // PostgreSQL syntax
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        );
      `);
      tableExists = tableCheck.rows[0].exists;
    }

    if (!tableExists) {
      console.log('Creating database tables...');
      const dbInfo = dbConfig.getDbInfo();

      if (dbInfo.isSQLite) {
        // SQLite version
        await pool.query(`
          CREATE TABLE users (
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
        await pool.query(`CREATE INDEX idx_users_email ON users(email);`);
        await pool.query(`CREATE INDEX idx_users_role ON users(role);`);
        await pool.query(`CREATE INDEX idx_users_active ON users(is_active);`);
        
        // Create triggers for updated_at (SQLite equivalent of PostgreSQL function)
        await pool.query(`
          CREATE TRIGGER update_users_updated_at
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

      console.log('Tables created successfully');
      await createSuperAdmin();
    } else {
      console.log('Database tables already exist');

      // Check if admin exists
      const dbInfo = dbConfig.getDbInfo();
      let adminExists = false;
      
      if (dbInfo.isSQLite) {
        const adminCheck = await pool.query(`
          SELECT COUNT(*) as count FROM users
          WHERE role = 'super_admin'
        `);
        adminExists = adminCheck.rows[0].count > 0;
      } else {
        const adminCheck = await pool.query(`
          SELECT EXISTS (
            SELECT FROM users
            WHERE role = 'super_admin'
          );
        `);
        adminExists = adminCheck.rows[0].exists;
      }

      if (!adminExists) {
        console.log('No super admin user found, creating one...');
        await createSuperAdmin();
      } else {
        console.log('Super admin user already exists');
      }
    }
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

async function createSuperAdmin() {
  try {
    const pool = dbConfig.pool;
    const email = process.env.SUPER_ADMIN_EMAIL || 'admin@example.com';
    const password = process.env.SUPER_ADMIN_PASSWORD || 'Admin123';

    if (!email || !password) {
      console.error("Missing super admin email or password in .env file.");
      return;
    }

    // Check if super admin already exists
    const dbInfo = dbConfig.getDbInfo();
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
      console.log("Super admin account already exists.");
      return;
    }

    // Hash password and create super admin
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

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

module.exports = { initializeDatabase };