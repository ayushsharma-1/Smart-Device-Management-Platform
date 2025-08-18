const authService = require('../services/authService');
const logger = require('../utils/logger');

class AuthController {
  async signup(req, res, next) {
    try {
      const result = await authService.signup(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const result = await authService.login(req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req, res, next) {
    try {
      res.json({
        success: true,
        user: req.user.toJSON()
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
