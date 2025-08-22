const authService = require('../services/authService');
const { AppError } = require('../middleware/errorHandler');

class AuthController {
  // Register new user
  async register(req, res, next) {
    try {
      const { username, email, password, role, organization, profile } = req.body;

      const userData = {
        username,
        email,
        password,
        role: role || 'user',
        organization,
        profile
      };

      const result = await authService.register(userData);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: result.user,
          tokens: result.tokens
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Login user
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const result = await authService.login(email, password);

      // Set refresh token as httpOnly cookie
      res.cookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          accessToken: result.tokens.accessToken
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Refresh access token
  async refreshToken(req, res, next) {
    try {
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

      if (!refreshToken) {
        throw new AppError('Refresh token required', 401, 'REFRESH_TOKEN_REQUIRED');
      }

      const result = await authService.refreshToken(refreshToken);

      // Update refresh token cookie
      res.cookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          user: result.user,
          accessToken: result.tokens.accessToken
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Logout user
  async logout(req, res, next) {
    try {
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

      if (refreshToken) {
        await authService.logout(req.user.id, refreshToken);
        
        // Blacklist the access token
        await authService.blacklistToken(req.token, 'access', req.user.id, 'logout');
      }

      // Clear refresh token cookie
      res.clearCookie('refreshToken');

      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      next(error);
    }
  }

  // Logout from all devices
  async logoutAll(req, res, next) {
    try {
      await authService.logoutAll(req.user.id);
      
      // Blacklist current access token
      await authService.blacklistToken(req.token, 'access', req.user.id, 'logout_all');

      // Clear refresh token cookie
      res.clearCookie('refreshToken');

      res.json({
        success: true,
        message: 'Logged out from all devices successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Get current user profile
  async getProfile(req, res, next) {
    try {
      res.json({
        success: true,
        data: {
          user: req.user
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Update user profile
  async updateProfile(req, res, next) {
    try {
      const { profile } = req.body;
      
      req.user.profile = { ...req.user.profile, ...profile };
      await req.user.save();

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: req.user
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Change password
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;

      await authService.changePassword(req.user.id, currentPassword, newPassword);

      // Clear refresh token cookie to force re-login
      res.clearCookie('refreshToken');

      res.json({
        success: true,
        message: 'Password changed successfully. Please login again.'
      });
    } catch (error) {
      next(error);
    }
  }

  // Verify token (for frontend)
  async verifyToken(req, res, next) {
    try {
      const { token } = req.body;

      const result = await authService.verifyToken(token);

      res.json({
        success: true,
        message: 'Token is valid',
        data: {
          user: result.user,
          decoded: result.decoded
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
