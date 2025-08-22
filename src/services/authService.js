const jwt = require('jsonwebtoken');
const User = require('../models/User');
const BlacklistedToken = require('../models/BlacklistedToken');
const config = require('../config/config');
const { AppError } = require('../middleware/errorHandler');
const { promisify } = require('util');

class AuthService {
  // Generate access token
  generateAccessToken(userId) {
    return jwt.sign(
      { userId, type: 'access' },
      config.jwt.accessSecret,
      { expiresIn: config.jwt.accessExpiresIn }
    );
  }

  // Generate refresh token
  generateRefreshToken(userId) {
    return jwt.sign(
      { userId, type: 'refresh' },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );
  }

  // Register new user
  async register(userData) {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [
          { email: userData.email },
          { username: userData.username }
        ]
      });

      if (existingUser) {
        throw new AppError('User already exists', 409, 'USER_EXISTS');
      }

      // Create new user
      const user = new User(userData);
      await user.save();

      // Generate tokens
      const accessToken = this.generateAccessToken(user._id);
      const refreshToken = this.generateRefreshToken(user._id);

      // Store refresh token
      const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await user.addRefreshToken(refreshToken, refreshTokenExpiry);

      return {
        user,
        tokens: {
          accessToken,
          refreshToken
        }
      };
    } catch (error) {
      if (error.code === 11000) {
        throw new AppError('User already exists', 409, 'USER_EXISTS');
      }
      throw error;
    }
  }

  // Login user
  async login(email, password) {
    try {
      // Find user by email
      const user = await User.findOne({ email }).select('+password');
      if (!user || !user.isActive) {
        throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
      }

      // Clean expired tokens
      await user.cleanExpiredTokens();

      // Generate new tokens
      const accessToken = this.generateAccessToken(user._id);
      const refreshToken = this.generateRefreshToken(user._id);

      // Store refresh token
      const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await user.addRefreshToken(refreshToken, refreshTokenExpiry);

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      return {
        user,
        tokens: {
          accessToken,
          refreshToken
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Refresh access token
  async refreshToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = await promisify(jwt.verify)(refreshToken, config.jwt.refreshSecret);
      
      if (decoded.type !== 'refresh') {
        throw new AppError('Invalid token type', 401, 'INVALID_TOKEN_TYPE');
      }

      // Find user and check if refresh token exists
      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        throw new AppError('User not found', 401, 'USER_NOT_FOUND');
      }

      // Check if refresh token exists in user's tokens
      const tokenExists = user.refreshTokens.some(rt => rt.token === refreshToken);
      if (!tokenExists) {
        throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
      }

      // Generate new tokens
      const newAccessToken = this.generateAccessToken(user._id);
      const newRefreshToken = this.generateRefreshToken(user._id);

      // Remove old refresh token and add new one
      await user.removeRefreshToken(refreshToken);
      const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await user.addRefreshToken(newRefreshToken, refreshTokenExpiry);

      return {
        user,
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken
        }
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AppError('Refresh token expired', 401, 'REFRESH_TOKEN_EXPIRED');
      }
      throw error;
    }
  }

  // Logout user
  async logout(userId, refreshToken) {
    try {
      const user = await User.findById(userId);
      if (user) {
        await user.removeRefreshToken(refreshToken);
      }
      
      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  // Logout from all devices
  async logoutAll(userId) {
    try {
      const user = await User.findById(userId);
      if (user) {
        user.refreshTokens = [];
        await user.save();
      }
      
      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  // Blacklist token
  async blacklistToken(token, tokenType, userId, reason = 'logout') {
    try {
      // Decode token to get expiry
      const decoded = jwt.decode(token);
      const expiresAt = new Date(decoded.exp * 1000);

      await BlacklistedToken.create({
        token,
        tokenType,
        userId,
        reason,
        expiresAt
      });

      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  // Verify token
  async verifyToken(token) {
    try {
      // Check if token is blacklisted
      const blacklistedToken = await BlacklistedToken.findOne({ token });
      if (blacklistedToken) {
        throw new AppError('Token has been revoked', 401, 'TOKEN_REVOKED');
      }

      // Verify token
      const decoded = await promisify(jwt.verify)(token, config.jwt.accessSecret);
      
      // Get user
      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        throw new AppError('User not found', 401, 'USER_NOT_FOUND');
      }

      return { user, decoded };
    } catch (error) {
      throw error;
    }
  }

  // Change password
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId).select('+password');
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        throw new AppError('Current password is incorrect', 400, 'INVALID_CURRENT_PASSWORD');
      }

      // Update password
      user.password = newPassword;
      await user.save();

      // Invalidate all refresh tokens (force re-login)
      user.refreshTokens = [];
      await user.save();

      return { success: true };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AuthService();
