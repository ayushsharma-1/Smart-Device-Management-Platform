const request = require('supertest');
const app = require('../app');
const { sequelize } = require('../database/connection');
const { User } = require('../models');

describe('Auth Endpoints', () => {
  beforeAll(async () => {
    // Setup test database
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clean up before each test
    await User.destroy({ where: {} });
  });

  describe('POST /auth/signup', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123',
        role: 'user'
      };

      const response = await request(app)
        .post('/auth/signup')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.password).toBeUndefined();
    });

    it('should reject duplicate email registration', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123',
        role: 'user'
      };

      // First registration
      await request(app)
        .post('/auth/signup')
        .send(userData)
        .expect(201);

      // Duplicate registration
      const response = await request(app)
        .post('/auth/signup')
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/auth/signup')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation error');
      expect(response.body.errors).toContain('Name is required');
    });

    it('should validate email format', async () => {
      const userData = {
        name: 'John Doe',
        email: 'invalid-email',
        password: 'SecurePass123'
      };

      const response = await request(app)
        .post('/auth/signup')
        .send(userData)
        .expect(400);

      expect(response.body.errors).toContain('Please provide a valid email address');
    });

    it('should validate password strength', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'weak'
      };

      const response = await request(app)
        .post('/auth/signup')
        .send(userData)
        .expect(400);

      expect(response.body.errors).toContain('Password must be at least 6 characters long');
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      await User.create({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123',
        role: 'user'
      });
    });

    it('should login successfully with valid credentials', async () => {
      const credentials = {
        email: 'john@example.com',
        password: 'SecurePass123'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(credentials)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe(credentials.email);
      expect(response.body.user.password).toBeUndefined();
    });

    it('should reject invalid email', async () => {
      const credentials = {
        email: 'nonexistent@example.com',
        password: 'SecurePass123'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(credentials)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should reject invalid password', async () => {
      const credentials = {
        email: 'john@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(credentials)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContain('Email is required');
      expect(response.body.errors).toContain('Password is required');
    });
  });

  describe('GET /auth/profile', () => {
    let token;
    let user;

    beforeEach(async () => {
      // Create and login user
      user = await User.create({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123',
        role: 'user'
      });

      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'john@example.com',
          password: 'SecurePass123'
        });

      token = loginResponse.body.token;
    });

    it('should return user profile for authenticated user', async () => {
      const response = await request(app)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.id).toBe(user.id);
      expect(response.body.user.email).toBe(user.email);
      expect(response.body.user.password).toBeUndefined();
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access token required');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid or expired token');
    });
  });
});
