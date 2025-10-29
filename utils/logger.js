// utils/logger.js - Enhanced logging system for all MedTestAI services

import winston from 'winston';
import path from 'path';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each log level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, service, ...meta } = info;
    let log = `${timestamp} [${level}] ${service ? `[${service}]` : ''} ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// File format (structured JSON)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  transports: [
    // Console transport with colored output
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // Error log file
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Combined log file
    new winston.transports.File({
      filename: path.join('logs', 'combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Audit log file (for compliance)
    new winston.transports.File({
      filename: path.join('logs', 'audit.log'),
      level: 'info',
      format: fileFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),
  ],
});

// Service-specific logger factory
export const createServiceLogger = (serviceName) => {
  return {
    error: (message, meta = {}) => {
      logger.error(message, { service: serviceName, ...meta });
    },
    warn: (message, meta = {}) => {
      logger.warn(message, { service: serviceName, ...meta });
    },
    info: (message, meta = {}) => {
      logger.info(message, { service: serviceName, ...meta });
    },
    http: (message, meta = {}) => {
      logger.http(message, { service: serviceName, ...meta });
    },
    debug: (message, meta = {}) => {
      logger.debug(message, { service: serviceName, ...meta });
    },
    
    // Specialized logging methods
    logStep: (step, message, meta = {}) => {
      logger.info(`STEP ${step}: ${message}`, { service: serviceName, ...meta });
    },
    
    logAPICall: (method, url, status, duration) => {
      logger.http('API Call', {
        service: serviceName,
        method,
        url,
        status,
        duration: `${duration}ms`,
      });
    },
    
    logAIInteraction: (model, prompt, response, tokens) => {
      logger.info('AI Interaction', {
        service: serviceName,
        model,
        promptLength: prompt?.length || 0,
        responseLength: response?.length || 0,
        tokens: tokens || 'N/A',
      });
    },
    
    logExport: (format, count, success) => {
      logger.info('Export Operation', {
        service: serviceName,
        format,
        testCaseCount: count,
        success,
      });
    },
    
    logCompliance: (framework, rules, passed) => {
      logger.info('Compliance Check', {
        service: serviceName,
        framework,
        rulesApplied: rules,
        passed,
      });
    },
  };
};

// Request logging middleware
export const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request
  logger.http('Incoming Request', {
    service: 'HTTP',
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  
  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.http('Response Sent', {
      service: 'HTTP',
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
    });
  });
  
  next();
};

// Error logging middleware
export const errorLogger = (err, req, res, next) => {
  logger.error('Error occurred', {
    service: 'ERROR_HANDLER',
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    body: req.body,
  });
  next(err);
};

export default logger;