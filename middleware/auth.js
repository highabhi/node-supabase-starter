const jwt = require('jsonwebtoken');
const pool = require('../database/config');


// Verify JWT token
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }

        const decode = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database to ensure they still exists and are active
        const userResult = await pool.query(
            'SELECT id, email, role, is_active FROM users WHERE id = $1',
            [decode.userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = userResult.rows[0];

        if (!user.is_active) {
            return res.status(401).json({
                success: false,
                message: 'Account deactivated'
            });
        }

        req.user = user;
        next();
    } catch (error) {
    if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Token expired'
        });
    }

    return res.status(403).json({
        success: false,
        message: 'Invalid token'
    });
    }
};

// check if user has required role
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const userRole = req.user.role;
        const allowedRoles = Array.isArray(roles) ? roles : [roles];

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permission'
            });
        }

        next();
    };
};


// Super admin only access
const requireSuperAdmin = requireRole('super_admin');

//Admin and super admin access
const requireAdmin = requireRole(['super_admin', 'admin']);

module.exports = {
    authenticateToken,
    requireRole,
    requireSuperAdmin,
    requireAdmin
}
