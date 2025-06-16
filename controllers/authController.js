const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require('../database/config')


class AuthController {
//     Login function
    static async login(req, res) {
        try {
            const { email, password } = req.validatedData;

        //     Get user from database
            const userResult = await pool.query(
                'SELECT id, email, password, role, is_active FROM users WHERE email = $1',
                [email.toLowerCase()]
            );
            if (userResult.rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            const user = userResult.rows[0];

        //     Check if user is active
            if (!user.is_active) {
                return res.status(401).json({
                    success:false,
                    message: 'Account has been deactivated'
                });
            }

        //     Verify password
            const isPasswordValid = await bcrypt.compare(password, user.password);

            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }


        //     Update last login
            await pool.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
                [user.id]
            );

        //     Generate JWT token
            const token = jwt.sign(
                {
                    userId: user.id,
                    email: user.email,
                    role: user.role
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: process.env.JWT_EXPIRES_IN || '24'
                }
            );

            res.json({
                success: true,
                message: 'Login successful',
                data: {
                    token,
                    user: {
                        id: user.id,
                        email: user.email,
                        role: user.role
                    }
                }
            });
        } catch ( error ) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }


//     Get current user profile
    static async getProfile(req, res) {
        try {
            const userId = req.user.id;

            const userResult = await pool.query(
                'SELECT id, email, role, is_active, created_at, last_login FROM users WHERE id = $1',
                [userId]
            );

            if (userResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            res.json({
                success: true,
                data: userResult.rows[0]
            });

        } catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

// Logout
static async logout(req, res) {
        try {
            res.json({
                success: true,
                message: 'Logged out successfully'
            });
        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}

module.exports = AuthController;