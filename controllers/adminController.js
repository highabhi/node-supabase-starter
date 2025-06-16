const bcrypt = require('bcryptjs');
const pool = require('../database/config');

class AdminController {
//     create new moderator or admin
    static async createModerator(req,res) {
        const client =  await pool.connect();

        try {
            await client.query('BEGIN');

            const { email, password, role } = req.validatedData;
            const createdBy = req.user.id;

        //     Check if user with this email already exists
            const existingUser = await client.query(
                'SELECT id FROM users WHERE email = $1',
                [email.toLowerCase()]
            );

            if (existingUser.rows.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'User with this email already exists'
                });
            }
        //     Only super admins can create other admins
            if (role === 'admin' && req.user.role !== 'super_admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Only super admins can create admin accounts'
                });
            }

        //     Hash password
            const hashedPassword =  await bcrypt.hash(password, 12);

        //     Create new user
            const result = await client.query(
                'INSERT INTO users (email, password, role, created_by) VALUES ($1, $2, $3, $4) RETURNING id, email, role, is_active, created_at',
                [email.toLowerCase(), hashedPassword, role, createdBy]
            );

            await client.query('COMMIT');
            const newUser = result.rows[0];

            res.status(201).json({
                success: true,
                message: `${role} created successfully`,
                data: {
                    id: newUser.id,
                    email: newUser.email,
                    role: newUser.role,
                    is_active: newUser.is_active,
                    created_at: newUser.created_at
                }
            });

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Create moderator error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        } finally {
            client.release();
        }
    }

//     Get all moderators and admins
    static async getAllUsers(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            const role = req.query.role;
            let query = `
            SELECT
            u.id,
            u.email,
            u.role,
            u.is_active,
            u.created_at,
            u.last_login,
            creator.email as created_by_email
            FROM users u 
            LEFT JOIN users creator ON u.created_by = creator.id
            WHERE u.role != 'super_admin'
            `;

            const queryParams = [];

        //     Filter by role if specified
            if (role && ['admin', 'moderator'].includes(role)) {
                query += ' AND u.role = $1';
                queryParams.push(role);
            }

            query += ' ORDER BY u.created_at DESC LIMIT $' + (queryParams.length + 1) + ' OFFSET $' + (queryParams.length + 2);
            queryParams.push(limit, offset);

            const result = await pool.query(query, queryParams);

        //     Get total count for pagination
            let countQuery  = 'SELECT COUNT(*) FROM users WHERE role != $1';
            const countParams = ['super_admin'];

            if (role && ['admin', 'moderator'].includes(role)) {
                countQuery += ' AND role = $2';
                countParams.push(role);
            }

            const countResult = await pool.query(countQuery, countParams);
            const totalUsers = parseInt(countResult.rows[0].count);

            res.json({
                success: true,
                data: {
                    users: result.rows,
                    pagination: {
                        current_page: page,
                        total_pages: Math.ceil(totalUsers / limit),
                        total_users: totalUsers,
                        per_page: limit
                    }
                }
            });

        } catch (error) {
            console.error('Get all users error: ', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

//     Update user ( activate/deactivate, & change role)
    static async updateUser(req, res) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const userId = parseInt(req.params.id);
            const updates = req.validatedData;

        //     Check if user exists and is not super admin

            const userResult = await client.query(
                'SELECT id, role, email FROM users WHERE id = $1 AND role != $2',
                [userId, 'super_admin']
            );

            if (userResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found or cannot be modified'
                });
            }

            const targetUser = userResult.rows[0];

        //     Only super admins can modify admin roles
            if (targetUser.role === 'admin' && req.user.role !== 'super_admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Only super admins can modify admin accounts'
                });
            }

        //     Only super admins can promote to admin
            if (updates.role === 'admin' && req.user.role !== 'super_admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Only super admins can create admin accounts'
                });
            }

        //     Build dynamic update query
            const updateFields = [];
            const updateValues = [];
            let paramCounter = 1;

            Object.keys(updates).forEach(field => {
                updateFields.push(`${field} = $${paramCounter}`);
                updateValues.push(updates[field]);
                paramCounter++;
            });

            updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
            updateValues.push(userId);

            const updateQuery = `
            UPDATE users
            SET ${updateFields.join(', ')}
            WHERE id = $${paramCounter}
            RETURNING id, email, role, is_active, updated_at
            `;

            const result = await client.query(updateQuery, updateValues);

            await client.query('COMMIT');

            res.json({
                success: true,
                message: 'User updated successfully',
                data: result.rows[0]
            });

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Update user error: ', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        } finally {
            client.release();
        }
    }

//     Get user by ID
    static async getUserById(req, res) {
        try {
            const userId = parseInt(req.params.id);

            const result = await pool.query(`
            SELECT
            u.id,
            u.email,
            u.role,
            u.is_active,
            u.created_at,
            u.updated_at,
            u.last_login,
            creator.email as created_by_email
            FROM users u 
            LEFT JOIN users creator ON u.created_by = creator.id
            WHERE u.id = $1 AND u.role != 'super_admin'
            `, [userId]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            res.json({
                success: true,
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Get user by ID error: ', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}

module.exports = AdminController;