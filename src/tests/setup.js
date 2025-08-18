// Test setup file
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'smart_device_platform_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'postgres123';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.JWT_SECRET = 'test_secret_key';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests

// Set shorter timeouts for tests
process.env.DEVICE_TIMEOUT_HOURS = '1';

// Global test utilities
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: console.error // Keep error logs for debugging
};
