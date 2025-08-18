const Joi = require('joi');

const signupSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.base': 'Name must be a string',
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name must not exceed 100 characters',
      'any.required': 'Name is required'
    }),
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email is required',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .min(6)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      'string.empty': 'Password is required',
      'any.required': 'Password is required'
    }),
  role: Joi.string()
    .valid('user', 'admin')
    .default('user')
    .messages({
      'any.only': 'Role must be either user or admin'
    })
});

const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email is required',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .required()
    .messages({
      'string.empty': 'Password is required',
      'any.required': 'Password is required'
    })
});

const deviceSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.base': 'Device name must be a string',
      'string.empty': 'Device name is required',
      'string.min': 'Device name must be at least 2 characters long',
      'string.max': 'Device name must not exceed 100 characters',
      'any.required': 'Device name is required'
    }),
  type: Joi.string()
    .valid('light', 'sensor', 'meter', 'camera', 'thermostat', 'switch', 'other')
    .required()
    .messages({
      'any.only': 'Device type must be one of: light, sensor, meter, camera, thermostat, switch, other',
      'any.required': 'Device type is required'
    }),
  status: Joi.string()
    .valid('active', 'inactive', 'maintenance')
    .default('active')
    .messages({
      'any.only': 'Device status must be one of: active, inactive, maintenance'
    }),
  metadata: Joi.object().optional()
});

const deviceUpdateSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.base': 'Device name must be a string',
      'string.min': 'Device name must be at least 2 characters long',
      'string.max': 'Device name must not exceed 100 characters'
    }),
  type: Joi.string()
    .valid('light', 'sensor', 'meter', 'camera', 'thermostat', 'switch', 'other')
    .optional()
    .messages({
      'any.only': 'Device type must be one of: light, sensor, meter, camera, thermostat, switch, other'
    }),
  status: Joi.string()
    .valid('active', 'inactive', 'maintenance')
    .optional()
    .messages({
      'any.only': 'Device status must be one of: active, inactive, maintenance'
    }),
  metadata: Joi.object().optional()
});

const heartbeatSchema = Joi.object({
  status: Joi.string()
    .valid('active', 'inactive', 'maintenance')
    .optional()
    .messages({
      'any.only': 'Status must be one of: active, inactive, maintenance'
    }),
  metadata: Joi.object().optional()
});

const deviceLogSchema = Joi.object({
  event: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.base': 'Event must be a string',
      'string.empty': 'Event is required',
      'string.min': 'Event must not be empty',
      'string.max': 'Event must not exceed 100 characters',
      'any.required': 'Event is required'
    }),
  value: Joi.number()
    .precision(2)
    .optional()
    .messages({
      'number.base': 'Value must be a number'
    }),
  metadata: Joi.object().optional()
});

const querySchema = Joi.object({
  type: Joi.string()
    .valid('light', 'sensor', 'meter', 'camera', 'thermostat', 'switch', 'other')
    .optional(),
  status: Joi.string()
    .valid('active', 'inactive', 'maintenance')
    .optional(),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .optional(),
  offset: Joi.number()
    .integer()
    .min(0)
    .default(0)
    .optional(),
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .optional(),
  sort: Joi.string()
    .valid('name', 'type', 'status', 'created_at', 'updated_at', 'last_active_at')
    .default('created_at')
    .optional(),
  order: Joi.string()
    .valid('ASC', 'DESC')
    .default('DESC')
    .optional()
});

const logsQuerySchema = Joi.object({
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .optional(),
  offset: Joi.number()
    .integer()
    .min(0)
    .default(0)
    .optional(),
  event: Joi.string()
    .optional(),
  start_date: Joi.date()
    .iso()
    .optional(),
  end_date: Joi.date()
    .iso()
    .min(Joi.ref('start_date'))
    .optional()
});

const usageQuerySchema = Joi.object({
  range: Joi.string()
    .valid('1h', '6h', '12h', '24h', '7d', '30d')
    .default('24h')
    .optional()
});

module.exports = {
  signupSchema,
  loginSchema,
  deviceSchema,
  deviceUpdateSchema,
  heartbeatSchema,
  deviceLogSchema,
  querySchema,
  logsQuerySchema,
  usageQuerySchema
};
