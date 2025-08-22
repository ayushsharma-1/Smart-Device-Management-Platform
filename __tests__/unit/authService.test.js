const { describe, test, expect, beforeEach } = require('@jest/globals');
const authService = require('../../src/services/authService');
const User = require('../../src/models/User');
const BlacklistedToken = require('../../src/models/BlacklistedToken');

// Mock the models
jest.mock('../../src/models/User');
jest.mock('../../src/models/BlacklistedToken');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    test('should register a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Test123456',
        organization: 'TestOrg'
      };

      const mockUser = {
        _id: 'user123',
        ...userData,
        save: jest.fn().mockResolvedValue(true),
        addRefreshToken: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnValue(userData)
      };

      User.findOne = jest.fn().mockResolvedValue(null);
      User.mockImplementation(() => mockUser);

      const result = await authService.register(userData);

      expect(result.user).toBe(mockUser);
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockUser.addRefreshToken).toHaveBeenCalled();
    });

    test('should throw error if user already exists', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Test123456',
        organization: 'TestOrg'
      };

      User.findOne = jest.fn().mockResolvedValue({ email: userData.email });

      await expect(authService.register(userData)).rejects.toThrow('User already exists');
    });
  });

  describe('login', () => {
    test('should login user successfully', async () => {
      const email = 'test@example.com';
      const password = 'Test123456';

      const mockUser = {
        _id: 'user123',
        email,
        isActive: true,
        comparePassword: jest.fn().mockResolvedValue(true),
        cleanExpiredTokens: jest.fn().mockResolvedValue(true),
        addRefreshToken: jest.fn().mockResolvedValue(true),
        save: jest.fn().mockResolvedValue(true)
      };

      User.findOne = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser)
      });

      const result = await authService.login(email, password);

      expect(result.user).toBe(mockUser);
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
      expect(mockUser.comparePassword).toHaveBeenCalledWith(password);
    });

    test('should throw error with invalid credentials', async () => {
      User.findOne = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
      });

      await expect(authService.login('test@example.com', 'wrongpassword'))
        .rejects.toThrow('Invalid credentials');
    });

    test('should throw error with wrong password', async () => {
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        isActive: true,
        comparePassword: jest.fn().mockResolvedValue(false)
      };

      User.findOne = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser)
      });

      await expect(authService.login('test@example.com', 'wrongpassword'))
        .rejects.toThrow('Invalid credentials');
    });
  });

  describe('generateAccessToken', () => {
    test('should generate a valid access token', () => {
      const userId = 'user123';
      const token = authService.generateAccessToken(userId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });
  });

  describe('generateRefreshToken', () => {
    test('should generate a valid refresh token', () => {
      const userId = 'user123';
      const token = authService.generateRefreshToken(userId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });
  });

  describe('blacklistToken', () => {
    test('should blacklist a token successfully', async () => {
      // Create a real JWT token for testing
      const jwt = require('jsonwebtoken');
      const token = jwt.sign({ userId: 'user123' }, 'test-secret', { expiresIn: '1h' });
      const userId = 'user123';

      BlacklistedToken.create = jest.fn().mockResolvedValue({
        token,
        userId,
        tokenType: 'access'
      });

      const result = await authService.blacklistToken(token, 'access', userId);

      expect(result.success).toBe(true);
      expect(BlacklistedToken.create).toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    test('should change password successfully', async () => {
      const userId = 'user123';
      const currentPassword = 'OldPass123';
      const newPassword = 'NewPass123';

      const mockUser = {
        _id: userId,
        comparePassword: jest.fn().mockResolvedValue(true),
        save: jest.fn().mockResolvedValue(true),
        refreshTokens: ['token1', 'token2']
      };

      User.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser)
      });

      const result = await authService.changePassword(userId, currentPassword, newPassword);

      expect(result.success).toBe(true);
      expect(mockUser.comparePassword).toHaveBeenCalledWith(currentPassword);
      expect(mockUser.password).toBe(newPassword);
      expect(mockUser.refreshTokens).toEqual([]);
      expect(mockUser.save).toHaveBeenCalledTimes(2);
    });

    test('should fail with incorrect current password', async () => {
      const userId = 'user123';
      const currentPassword = 'WrongPass123';
      const newPassword = 'NewPass123';

      const mockUser = {
        _id: userId,
        comparePassword: jest.fn().mockResolvedValue(false)
      };

      User.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser)
      });

      await expect(authService.changePassword(userId, currentPassword, newPassword))
        .rejects.toThrow('Current password is incorrect');
    });
  });
});
