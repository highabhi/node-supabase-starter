const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { validateLogin } = require('../middleware/validation');

//POST /api/auth/login - User Login
router.post('/login', validateLogin, AuthController.login);

//GET /api/auth/profile - Get current user profile
router.get('/profile', authenticateToken, AuthController.getProfile);

//POST /api/auth/logout - User logout
router.post('/logout', authenticateToken, AuthController.logout);

module.exports = router;