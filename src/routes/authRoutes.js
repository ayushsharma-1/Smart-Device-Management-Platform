const express = require('express');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../validators');
const { signupSchema, loginSchema } = require('../validators/schemas');

const router = express.Router();

// Apply auth rate limiter to all auth routes
router.use(authLimiter);

// Public routes
router.post('/signup', validate(signupSchema), authController.signup);
router.post('/login', validate(loginSchema), authController.login);

// Protected routes
router.get('/profile', authenticate, authController.getProfile);

module.exports = router;
