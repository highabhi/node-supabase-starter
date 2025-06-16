const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const { authenticateToken, requireAdmin, requireSuperAdmin } = require('../middleware/auth');
const { validateCreateModerator, validateUpdateUser } = require('../middleware/validation');


//All admin routes require authentication
router.use(authenticateToken);

//POST /api/admin/user - Create new moderator or admin (admin+ only)
router.post('/users', requireAdmin, validateCreateModerator, AdminController.createModerator);


//GET /api/admin/users  - Get all users with pagination (admin+ only)
router.get('/users', requireAdmin, AdminController.getAllUsers);

//Get /api/admin/users/:id - Get user by ID (admin+ only)
router.get('/users/:id', requireAdmin, AdminController.getUserById);

// PUT /api/admin/users/:id - Update user (admin+ only)
router.put('/users/:id', requireAdmin, validateUpdateUser, AdminController.updateUser);



module.exports = router;