// MedTestAI Healthcare AI Testing Platform
// HIPAA-compliant Express server with FHIR integration
// Project: pro-variety-472211-b9

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const compression = require('compression');
const winston = require('winston');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const multer = require('multer');
const crypto = require('crypto');

// Google Cloud services
// const { HealthcareServiceClient } = require('@google-cloud/healthcare');
const { healthcare } = require('@googleapis/healthcare');
// const { DocumentProcessorServiceClient } = require('@google-cloud/documentai');
// const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { documentai } = require('googleapis');
const { secretmanager } = require('googleapis');
const { Storage } = require('@google-cloud/storage');

// FHIR clients
const Client = require('fhir-kit-client');
const fhirClient = require('fhirclient');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Google Cloud clients
const healthcareClient = new healthcare();
const documentAIClient = new documentai();
const secretManagerClient = new secretmanager();
const storage = new Storage();

// HIPAA-compliant logging configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      // Sanitize PHI from logs
      const sanitizedMeta = sanitizePHI(meta);
      return JSON.stringify({ timestamp, level, message, ...sanitizedMeta });
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: 'logs/hipaa-audit.log',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true
    })
  ]
});

// PHI sanitization function
function sanitizePHI(obj) {
  const phiPatterns = [
    /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
    /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g, // Credit card
    /\b\d{10,11}\b/g, // Phone numbers
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g // Email
  ];
  
  const sanitized = JSON.parse(JSON.stringify(obj));
  
  function recursiveSanitize(item) {
    if (typeof item === 'string') {
      phiPatterns.forEach(pattern => {
        item = item.replace(pattern, '[REDACTED]');
      });
      return item;
    } else if (typeof item === 'object' && item !== null) {
      Object.keys(item).forEach(key => {
        item[key] = recursiveSanitize(item[key]);
      });
    }
    return item;
  }
  
  return recursiveSanitize(sanitized);
}

// Enhanced security headers for healthcare
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: "no-referrer" },
  crossOriginOpenerPolicy: { policy: "same-origin" }
}));

// CORS configuration for healthcare APIs
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://medtestai-frontend.uc.r.appspot.com',
      'https://pro-variety-472211-b9.uc.r.appspot.com',
      'http://localhost:3000',
      'http://localhost:3001'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`Blocked CORS request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'X-API-Key',
    'X-Patient-ID',
    'X-Session-ID'
  ],
  credentials: true,
  maxAge: 86400 // 24 hours preflight cache
};

app.use(cors(corsOptions));

// Healthcare-specific rate limiting
const healthcareRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: {
    error: "Rate limit exceeded for healthcare API",
    retryAfter: Math.round(15 * 60 * 1000 / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path
    });
    res.status(429).json({
      error: "Rate limit exceeded",
      retryAfter: Math.round(15 * 60 * 1000 / 1000)
    });
  }
});

app.use(healthcareRateLimit);
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HIPAA audit logging middleware
app.use((req, res, next) => {
  const auditData = {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    sessionId: req.get('X-Session-ID'),
    patientId: req.get('X-Patient-ID'),
    timestamp: new Date().toISOString(),
    userId: req.user?.id || 'anonymous'
  };
  
  logger.info('API Request', auditData);
  
  // Capture response for audit trail
  const originalSend = res.send;
  res.send = function(data) {
    logger.info('API Response', {
      ...auditData,
      statusCode: res.statusCode,
      responseSize: Buffer.byteLength(data)
    });
    originalSend.call(this, data);
  };
  
  next();
});

// JWT Authentication middleware
const authenticateJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      
      logger.info('User authenticated', {
        userId: decoded.id,
        role: decoded.role,
        sessionId: req.get('X-Session-ID')
      });
      
      next();
    } catch (error) {
      logger.warn('JWT verification failed', {
        error: error.message,
        token: token.substring(0, 10) + '...',
        ip: req.ip
      });
      
      return res.status(401).json({ 
        error: 'Invalid or expired token',
        code: 'AUTH_INVALID_TOKEN'
      });
    }
  } else {
    return res.status(401).json({ 
      error: 'Authorization header required',
      code: 'AUTH_MISSING_HEADER'
    });
  }
};

// RBAC middleware for healthcare roles
const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    if (roles.length && !roles.includes(req.user.role)) {
      logger.warn('Access denied - insufficient privileges', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: roles,
        endpoint: req.path
      });
      
      return res.status(403).json({ 
        error: 'Insufficient privileges',
        code: 'AUTH_INSUFFICIENT_PRIVILEGES'
      });
    }
    
    next();
  };
};

// FHIR validation middleware
const validateFHIR = (req, res, next) => {
  if (req.path.startsWith('/fhir/')) {
    const contentType = req.get('Content-Type');
    if (contentType && !contentType.includes('application/fhir+json')) {
      return res.status(400).json({
        error: 'Invalid Content-Type for FHIR resource. Expected application/fhir+json',
        code: 'FHIR_INVALID_CONTENT_TYPE'
      });
    }
  }
  next();
};

// PHI encryption utilities
class PHIEncryption {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32;
    this.ivLength = 16;
  }

  encrypt(plaintext, key) {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipher(this.algorithm, key);
    cipher.setAAD(Buffer.from('PHI-DATA'));
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  decrypt(encryptedData, key) {
    const decipher = crypto.createDecipher(
      this.algorithm, 
      key,
      Buffer.from(encryptedData.iv, 'hex')
    );
    
    decipher.setAAD(Buffer.from('PHI-DATA'));
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

const phiEncryption = new PHIEncryption();

// FHIR Client initialization
const initializeFHIRClient = () => {
  return new Client({
    baseUrl: process.env.FHIR_SERVER_URL || `https://healthcare.googleapis.com/v1/projects/pro-variety-472211-b9/locations/us-central1/datasets/medtestai-dataset/fhirStores/medtestai-fhir-store/fhir`,
    customHeaders: {
      'Authorization': `Bearer ${process.env.GOOGLE_CLOUD_ACCESS_TOKEN}`
    }
  });
};

// Routes

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Authentication endpoints
app.post('/auth/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        errors: errors.array(),
        code: 'VALIDATION_ERROR'
      });
    }

    const { email, password } = req.body;
    
    // TODO: Implement user authentication with database
    // This is a simplified example
    const user = { id: 1, email, role: 'healthcare_professional' };
    
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    logger.info('User logged in', { userId: user.id, email });

    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role },
      expiresIn: '8h'
    });
  } catch (error) {
    logger.error('Login error', { error: error.message });
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'LOGIN_ERROR'
    });
  }
});

// Document processing endpoints
app.post('/api/documents/process', 
  authenticateJWT, 
  authorize(['healthcare_professional', 'qa_engineer']),
  async (req, res) => {
    try {
      const { documentContent, documentType, complianceFramework } = req.body;
      
      logger.info('Document processing started', {
        userId: req.user.id,
        documentType,
        complianceFramework,
        contentLength: documentContent?.length
      });

      // TODO: Implement Document AI processing
      const processedDocument = {
        id: crypto.randomUUID(),
        extractedRequirements: [
          {
            id: 'REQ-001',
            text: 'System shall implement role-based access control for PHI',
            category: 'security',
            compliance: ['HIPAA'],
            risk: 'high'
          },
          {
            id: 'REQ-002', 
            text: 'All patient data access must be logged with timestamps',
            category: 'audit',
            compliance: ['HIPAA'],
            risk: 'medium'
          }
        ],
        complianceAnalysis: {
          framework: complianceFramework,
          coverage: 95,
          gaps: [],
          recommendations: []
        }
      };

      logger.info('Document processing completed', {
        userId: req.user.id,
        documentId: processedDocument.id,
        requirementsCount: processedDocument.extractedRequirements.length
      });

      res.json(processedDocument);
    } catch (error) {
      logger.error('Document processing error', { 
        error: error.message,
        userId: req.user.id 
      });
      res.status(500).json({ 
        error: 'Document processing failed',
        code: 'DOCUMENT_PROCESSING_ERROR'
      });
    }
  }
);

// Test generation endpoints
app.post('/api/tests/generate',
  authenticateJWT,
  authorize(['qa_engineer', 'healthcare_professional']),
  async (req, res) => {
    try {
      const { requirements, methodology, toolchain, complianceFramework } = req.body;
      
      logger.info('Test generation started', {
        userId: req.user.id,
        methodology,
        toolchain,
        complianceFramework,
        requirementsCount: requirements?.length
      });

      // TODO: Implement AI-powered test generation
      const generatedTests = {
        methodology,
        toolchain,
        summary: {
          totalTestCases: 127,
          coverage: 100,
          complianceTestCases: 24,
          functionalTestCases: 78,
          securityTestCases: 25
        },
        structure: {
          epics: methodology === 'agile' ? [
            {
              id: 'EPIC-001',
              title: 'Patient Data Security',
              features: [
                {
                  id: 'FEAT-001',
                  title: 'Access Control Implementation',
                  stories: [
                    {
                      id: 'STORY-001',
                      title: 'As a healthcare professional, I want role-based access to patient data',
                      testSuites: [
                        {
                          id: 'TS-001',
                          name: 'RBAC Validation Suite',
                          testCases: [
                            {
                              id: 'TC-001',
                              title: 'Verify unauthorized access prevention',
                              steps: [
                                'Login with unauthorized user credentials',
                                'Attempt to access patient records',
                                'Verify access is denied',
                                'Confirm audit log entry created'
                              ],
                              expectedResult: 'Access denied with proper audit trail',
                              compliance: ['HIPAA-164.312(a)(1)']
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ] : [],
          testSuites: [
            {
              id: 'TS-SECURITY',
              name: 'Security Test Suite',
              testCases: 25
            },
            {
              id: 'TS-FUNCTIONAL',
              name: 'Functional Test Suite', 
              testCases: 78
            },
            {
              id: 'TS-COMPLIANCE',
              name: 'HIPAA Compliance Suite',
              testCases: 24
            }
          ]
        },
        traceabilityMatrix: {
          requirementsCoverage: 100,
          testCaseLinks: requirements?.map(req => ({
            requirementId: req.id,
            testCases: [`TC-${Math.floor(Math.random() * 1000)}`]
          })) || []
        },
        exportOptions: {
          jira: toolchain.includes('jira'),
          testRail: toolchain.includes('testrail'), 
          azureDevOps: toolchain.includes('azure-devops'),
          jenkins: toolchain.includes('jenkins')
        }
      };

      logger.info('Test generation completed', {
        userId: req.user.id,
        totalTestCases: generatedTests.summary.totalTestCases,
        methodology,
        toolchain
      });

      res.json(generatedTests);
    } catch (error) {
      logger.error('Test generation error', { 
        error: error.message,
        userId: req.user.id 
      });
      res.status(500).json({ 
        error: 'Test generation failed',
        code: 'TEST_GENERATION_ERROR'
      });
    }
  }
);

// FHIR endpoints
app.get('/fhir/Patient/:id',
  authenticateJWT,
  authorize(['healthcare_professional']),
  validateFHIR,
  async (req, res) => {
    try {
      const fhir = initializeFHIRClient();
      const patient = await fhir.read({ resourceType: 'Patient', id: req.params.id });
      
      logger.info('FHIR Patient accessed', {
        userId: req.user.id,
        patientId: req.params.id,
        resourceType: 'Patient'
      });

      res.setHeader('Content-Type', 'application/fhir+json');
      res.json(patient);
    } catch (error) {
      logger.error('FHIR Patient access error', { 
        error: error.message,
        userId: req.user.id,
        patientId: req.params.id
      });
      res.status(404).json({ 
        error: 'Patient not found',
        code: 'FHIR_PATIENT_NOT_FOUND'
      });
    }
  }
);

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    userId: req.user?.id
  });

  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_SERVER_ERROR',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  logger.warn('404 - Route not found', {
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  res.status(404).json({
    error: 'Route not found',
    code: 'ROUTE_NOT_FOUND',
    path: req.url
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  logger.info('MedTestAI Healthcare AI Testing Platform started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version
  });
});

module.exports = app;