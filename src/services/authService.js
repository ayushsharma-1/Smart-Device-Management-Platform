const { User } = require('../models');
const { generateToken } = require('../utils/jwt');
const logger = require('../utils/logger');

class AuthService {
  async signup(userData) {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({
        where: { email: userData.email }
      });

      if (existingUser) {
        const error = new Error('User with this email already exists');
        error.status = 409;
        throw error;
      }

      // Create new user
      const user = await User.create(userData);
      
      logger.info(`New user registered: ${user.email}`);
      
      return {
        success: true,
        message: 'User registered successfully',
        user: user.toJSON()
      };
    } catch (error) {
      logger.error('Signup error:', error);
      throw error;
    }
  }

  async login(credentials) {
    try {
      const { email, password } = credentials;

      // Find user by email
      const user = await User.findOne({
        where: { email }
      });

      if (!user) {
        const error = new Error('Invalid email or password');
        error.status = 401;
        throw error;
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        const error = new Error('Invalid email or password');
        error.status = 401;
        throw error;
      }

      // Generate JWT token
      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role
      });

      logger.info(`User logged in: ${user.email}`);

      return {
        success: true,
        token,
        user: user.toJSON()
      };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  async getUserById(userId) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        const error = new Error('User not found');
        error.status = 404;
        throw error;
      }
      return user;
    } catch (error) {
      logger.error('Get user error:', error);
      throw error;
    }
  }
}

module.exports = new AuthService();
