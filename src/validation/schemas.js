const Joi = require('joi');

// User validation schemas
const userSchemas = {
  register: Joi.object({
    username: Joi.string()
      .alphanum()
      .min(3)
      .max(50)
      .required()
      .messages({
        'string.alphanum': 'Username can only contain letters and numbers',
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username cannot exceed 50 characters',
        'any.required': 'Username is required'
      }),
    
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    
    password: Joi.string()
      .min(6)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .required()
      .messages({
        'string.min': 'Password must be at least 6 characters long',
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, and one number',
        'any.required': 'Password is required'
      }),
    
    role: Joi.string()
      .valid('admin', 'user', 'viewer')
      .default('user'),
    
    organization: Joi.string()
      .min(2)
      .max(100)
      .required()
      .messages({
        'string.min': 'Organization must be at least 2 characters long',
        'string.max': 'Organization cannot exceed 100 characters',
        'any.required': 'Organization is required'
      }),
    
    profile: Joi.object({
      firstName: Joi.string().min(1).max(50),
      lastName: Joi.string().min(1).max(50),
      phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
      avatar: Joi.string().uri()
    }).optional()
  }),

  login: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Password is required'
      })
  }),

  updateProfile: Joi.object({
    profile: Joi.object({
      firstName: Joi.string().min(1).max(50),
      lastName: Joi.string().min(1).max(50),
      phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
      avatar: Joi.string().uri()
    }).required()
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string()
      .required()
      .messages({
        'any.required': 'Current password is required'
      }),
    
    newPassword: Joi.string()
      .min(6)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .required()
      .messages({
        'string.min': 'New password must be at least 6 characters long',
        'string.pattern.base': 'New password must contain at least one lowercase letter, one uppercase letter, and one number',
        'any.required': 'New password is required'
      })
  })
};

// Device validation schemas
const deviceSchemas = {
  create: Joi.object({
    deviceId: Joi.string()
      .pattern(/^[a-zA-Z0-9_-]+$/)
      .min(3)
      .max(50)
      .required()
      .messages({
        'string.pattern.base': 'Device ID can only contain letters, numbers, hyphens, and underscores',
        'string.min': 'Device ID must be at least 3 characters long',
        'string.max': 'Device ID cannot exceed 50 characters',
        'any.required': 'Device ID is required'
      }),
    
    name: Joi.string()
      .min(1)
      .max(100)
      .required()
      .messages({
        'string.min': 'Device name is required',
        'string.max': 'Device name cannot exceed 100 characters',
        'any.required': 'Device name is required'
      }),
    
    type: Joi.string()
      .valid('sensor', 'actuator', 'gateway', 'camera', 'thermostat', 'light', 'lock', 'other')
      .required()
      .messages({
        'any.only': 'Device type must be one of: sensor, actuator, gateway, camera, thermostat, light, lock, other',
        'any.required': 'Device type is required'
      }),
    
    status: Joi.string()
      .valid('online', 'offline', 'maintenance', 'error')
      .default('offline'),
    
    location: Joi.object({
      building: Joi.string().max(100),
      floor: Joi.string().max(50),
      room: Joi.string().max(100),
      coordinates: Joi.object({
        latitude: Joi.number().min(-90).max(90),
        longitude: Joi.number().min(-180).max(180)
      })
    }).optional(),
    
    specifications: Joi.object({
      manufacturer: Joi.string().max(100),
      model: Joi.string().max(100),
      serialNumber: Joi.string().max(100),
      firmwareVersion: Joi.string().max(50),
      hardwareVersion: Joi.string().max(50),
      powerSource: Joi.string().valid('battery', 'mains', 'solar', 'other').default('mains'),
      communicationProtocol: Joi.string().valid('wifi', 'bluetooth', 'zigbee', 'lora', 'cellular', 'ethernet').default('wifi')
    }).optional(),
    
    configuration: Joi.object({
      settings: Joi.object(),
      thresholds: Joi.object(),
      schedules: Joi.object()
    }).optional(),
    
    connectivity: Joi.object({
      ipAddress: Joi.string().ip(),
      macAddress: Joi.string().pattern(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/),
      signalStrength: Joi.number().min(-100).max(0),
      heartbeatInterval: Joi.number().min(30).max(3600).default(300)
    }).optional(),
    
    health: Joi.object({
      batteryLevel: Joi.number().min(0).max(100),
      temperature: Joi.number().min(-50).max(100),
      uptime: Joi.number().min(0)
    }).optional(),
    
    tags: Joi.array().items(Joi.string().max(50)).max(20),
    notes: Joi.string().max(500)
  }),

  update: Joi.object({
    name: Joi.string().min(1).max(100),
    type: Joi.string().valid('sensor', 'actuator', 'gateway', 'camera', 'thermostat', 'light', 'lock', 'other'),
    status: Joi.string().valid('online', 'offline', 'maintenance', 'error'),
    location: Joi.object({
      building: Joi.string().max(100),
      floor: Joi.string().max(50),
      room: Joi.string().max(100),
      coordinates: Joi.object({
        latitude: Joi.number().min(-90).max(90),
        longitude: Joi.number().min(-180).max(180)
      })
    }),
    specifications: Joi.object({
      manufacturer: Joi.string().max(100),
      model: Joi.string().max(100),
      serialNumber: Joi.string().max(100),
      firmwareVersion: Joi.string().max(50),
      hardwareVersion: Joi.string().max(50),
      powerSource: Joi.string().valid('battery', 'mains', 'solar', 'other'),
      communicationProtocol: Joi.string().valid('wifi', 'bluetooth', 'zigbee', 'lora', 'cellular', 'ethernet')
    }),
    configuration: Joi.object({
      settings: Joi.object(),
      thresholds: Joi.object(),
      schedules: Joi.object()
    }),
    connectivity: Joi.object({
      ipAddress: Joi.string().ip(),
      macAddress: Joi.string().pattern(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/),
      signalStrength: Joi.number().min(-100).max(0),
      heartbeatInterval: Joi.number().min(30).max(3600)
    }),
    health: Joi.object({
      batteryLevel: Joi.number().min(0).max(100),
      temperature: Joi.number().min(-50).max(100),
      uptime: Joi.number().min(0)
    }),
    tags: Joi.array().items(Joi.string().max(50)).max(20),
    notes: Joi.string().max(500)
  }).min(1),

  statusUpdate: Joi.object({
    status: Joi.string()
      .valid('online', 'offline', 'maintenance', 'error')
      .required()
      .messages({
        'any.only': 'Status must be one of: online, offline, maintenance, error',
        'any.required': 'Status is required'
      })
  }),

  logEvent: Joi.object({
    eventType: Joi.string()
      .valid('heartbeat', 'status_change', 'data_reading', 'error', 'command', 'configuration_change')
      .required(),
    message: Joi.string().min(1).max(500).required(),
    data: Joi.object().optional(),
    severity: Joi.string().valid('info', 'warning', 'error', 'critical').default('info')
  }),

  bulkUpdate: Joi.object({
    deviceIds: Joi.array()
      .items(Joi.string().pattern(/^[a-zA-Z0-9_-]+$/))
      .min(1)
      .max(100)
      .required(),
    updates: Joi.object().min(1).required()
  })
};

// Export validation schemas
const exportSchemas = {
  create: Joi.object({
    type: Joi.string()
      .valid('device_logs', 'usage_report', 'device_list')
      .required()
      .messages({
        'any.only': 'Export type must be one of: device_logs, usage_report, device_list',
        'any.required': 'Export type is required'
      }),
    
    parameters: Joi.object({
      format: Joi.string().valid('csv', 'json').default('csv'),
      startDate: Joi.date().iso().optional(),
      endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
      deviceIds: Joi.array().items(Joi.string()).max(1000).optional(),
      filters: Joi.object().optional()
    }).required()
  }),

  bulkExport: Joi.object({
    exports: Joi.array()
      .items(Joi.object({
        type: Joi.string().valid('device_logs', 'usage_report', 'device_list').required(),
        parameters: Joi.object().required()
      }))
      .min(1)
      .max(10)
      .required()
  })
};

// Query validation schemas
const querySchemas = {
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  }),

  dateRange: Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional()
  }),

  deviceFilters: Joi.object({
    search: Joi.string().max(100).optional(),
    type: Joi.string().valid('sensor', 'actuator', 'gateway', 'camera', 'thermostat', 'light', 'lock', 'other').optional(),
    status: Joi.string().valid('online', 'offline', 'maintenance', 'error').optional(),
    organization: Joi.string().max(100).optional(),
    owner: Joi.string().optional(),
    location: Joi.string().max(200).optional()
  }),

  analytics: Joi.object({
    period: Joi.string().valid('hour', 'day', 'week', 'month').default('day'),
    deviceIds: Joi.string().optional(), // Comma-separated string
    organization: Joi.string().max(100).optional()
  })
};

// Validation middleware factory
const createValidationMiddleware = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }))
      });
    }

    req.body = value;
    next();
  };
};

// Query validation middleware factory
const createQueryValidationMiddleware = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: true // Allow unknown query parameters
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Query validation error',
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }))
      });
    }

    req.query = { ...req.query, ...value };
    next();
  };
};

module.exports = {
  userSchemas,
  deviceSchemas,
  exportSchemas,
  querySchemas,
  createValidationMiddleware,
  createQueryValidationMiddleware
};
