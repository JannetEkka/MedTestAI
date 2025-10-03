import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Google Cloud Services
import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import { Storage } from '@google-cloud/storage';
import { SpeechClient } from '@google-cloud/speech';

// ES module dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://localhost:3001',
    'https://pro-variety-472211-b9.web.app',
    'https://pro-variety-472211-b9.firebaseapp.com'
  ],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Google Cloud Services Initialization
let documentAI, cloudStorage, speechClient, bucket;

try {
  // Document AI setup
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    documentAI = new DocumentProcessorServiceClient();
    cloudStorage = new Storage();
    speechClient = new SpeechClient();
    
    // Initialize storage bucket
    const bucketName = process.env.GCS_BUCKET_NAME || 'medtestai-documents';
    bucket = cloudStorage.bucket(bucketName);
    
    console.log('✅ Google Cloud services initialized');
  } else {
    console.log('⚠️ Google Cloud credentials not found - using basic mode');
  }
} catch (error) {
  console.log('⚠️ Google Cloud initialization failed - using basic mode:', error.message);
}

// Enhanced file upload with cloud storage
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.'));
    }
  }
});

// Enhanced Gemini Service
class GeminiService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      console.log('⚠️ No Gemini API key - using mock mode');
      this.genAI = null;
    } else {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      console.log('✅ Gemini AI initialized');
    }
    
    this.models = [
      'gemini-2.0-flash-001',
      'gemini-1.5-flash', 
      'gemini-1.5-pro'
    ];
  }

  async generateContent(prompt) {
    if (!this.genAI) {
      console.log('🤖 Using mock response - no API key');
      return this.getMockResponse();
    }

    for (let i = 0; i < this.models.length; i++) {
      try {
        console.log(`🤖 Trying model: ${this.models[i]}`);
        
        const model = this.genAI.getGenerativeModel({
          model: this.models[i],
          generationConfig: {
            temperature: 0.7,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 4096,
            responseMimeType: "application/json"
          }
        });

        const enhancedPrompt = `
You MUST respond with valid JSON only. No markdown, no explanations.

Generate comprehensive healthcare test cases based on: ${prompt}

Response format:
{
  "testCases": [
    {
      "testId": "TC001",
      "testName": "Test Case Name", 
      "description": "Detailed description",
      "priority": "High",
      "category": "authentication",
      "testingTechnique": "boundary-value-analysis",
      "riskLevel": "High",
      "complianceRequirements": ["HIPAA Privacy Rule"],
      "automationPotential": "High",
      "preconditions": ["User logged in"],
      "testSteps": ["Step 1", "Step 2"],
      "expectedResults": ["Expected result"]
    }
  ],
  "summary": {
    "totalTestCases": 1,
    "coverage": 100,
    "highPriorityCount": 1,
    "complianceFramework": "HIPAA"
  }
}`;

        const result = await model.generateContent(enhancedPrompt);
        const response = await result.response;
        const text = response.text();
        
        console.log(`✅ Got response from ${this.models[i]}, length: ${text.length}`);
        
        // Try to parse JSON
        const parsed = this.parseJSON(text);
        if (parsed) {
          console.log(`✅ Successfully parsed JSON with ${this.models[i]}`);
          return parsed;
        }
        
      } catch (error) {
        console.error(`❌ Model ${this.models[i]} failed:`, error.message);
        if (i === this.models.length - 1) {
          console.log('🔄 All models failed, using mock response');
          return this.getMockResponse();
        }
      }
    }
  }

  parseJSON(text) {
    // Strategy 1: Direct parsing
    try {
      return JSON.parse(text.trim());
    } catch (e) {
      console.log('📝 Direct parse failed, trying extraction...');
    }

    // Strategy 2: Extract from code blocks
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1].trim());
      } catch (e) {
        console.log('📝 Code block extraction failed...');
      }
    }

    // Strategy 3: Find JSON object
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        let cleanJson = jsonMatch[0]
          .replace(/,(\s*[}\]])/g, '$1')  // Remove trailing commas
          .replace(/([{,]\s*)(\w+):/g, '$1"$2":')  // Quote keys
          .replace(/:\s*'([^']*?)'/g, ': "$1"');   // Replace single quotes
        
        return JSON.parse(cleanJson);
      } catch (e) {
        console.log('📝 JSON repair failed...');
      }
    }

    return null;
  }

  getMockResponse() {
    return {
      testCases: [
        {
          testId: "TC001",
          testName: "Secure Healthcare Provider Authentication",
          description: "Verify healthcare provider can authenticate securely with multi-factor authentication and proper session management",
          priority: "High",
          category: "authentication",
          testingTechnique: "boundary-value-analysis",
          riskLevel: "High",
          complianceRequirements: ["HIPAA Security Rule", "Multi-Factor Authentication"],
          automationPotential: "High",
          preconditions: ["Valid provider credentials", "MFA device available", "Network connectivity"],
          testSteps: [
            "Navigate to login page",
            "Enter valid username and password",
            "Complete MFA verification",
            "Verify successful authentication",
            "Check session timeout configuration"
          ],
          expectedResults: [
            "User authenticated successfully",
            "Session established with proper timeout",
            "Login event logged for audit trail",
            "User redirected to authorized dashboard"
          ]
        },
        {
          testId: "TC002",
          testName: "Patient Record Access Authorization",
          description: "Ensure healthcare providers can only access patient records they are authorized to view",
          priority: "High",
          category: "authorization",
          testingTechnique: "equivalence-partitioning",
          riskLevel: "High",
          complianceRequirements: ["HIPAA Privacy Rule", "Minimum Necessary Standard"],
          automationPotential: "Medium",
          preconditions: ["Provider authenticated", "Patient records exist", "Role-based permissions configured"],
          testSteps: [
            "Search for patient record",
            "Verify access permissions based on provider role",
            "Attempt to access unauthorized records",
            "Display only authorized patient data",
            "Log all access attempts"
          ],
          expectedResults: [
            "Only authorized records are displayed",
            "Unauthorized access attempts are blocked",
            "Access attempts logged for audit",
            "PHI protected according to minimum necessary principle"
          ]
        },
        {
          testId: "TC003",
          testName: "Patient Data Encryption Validation",
          description: "Verify that all patient health information is properly encrypted during transmission and storage",
          priority: "High",
          category: "security",
          testingTechnique: "security-testing",
          riskLevel: "Critical",
          complianceRequirements: ["HIPAA Security Rule", "Data Encryption Requirements"],
          automationPotential: "High",
          preconditions: ["System configured with encryption", "Test patient data available"],
          testSteps: [
            "Transmit patient data over network",
            "Verify TLS encryption is active",
            "Check data storage encryption",
            "Validate encryption key management",
            "Test data integrity checks"
          ],
          expectedResults: [
            "Data encrypted during transmission using TLS 1.2+",
            "PHI encrypted at rest using AES-256",
            "Encryption keys properly managed and rotated",
            "Data integrity maintained throughout process"
          ]
        }
      ],
      summary: {
        totalTestCases: 3,
        coverage: 95,
        highPriorityCount: 3,
        complianceFramework: "HIPAA",
        categoriesCount: {
          authentication: 1,
          authorization: 1,
          security: 1
        }
      }
    };
  }
}

// Document AI Processing Service
class HealthcareDocumentProcessor {
  constructor() {
    this.processorName = process.env.DOCUMENT_AI_PROCESSOR_NAME;
  }

  async processDocument(filePath, mimeType) {
    if (!documentAI || !this.processorName) {
      console.log('📄 Document AI not available - using basic text extraction');
      return this.basicTextExtraction(filePath);
    }

    try {
      console.log('📄 Processing document with Document AI...');
      
      const imageFile = fs.readFileSync(filePath);
      const encodedImage = Buffer.from(imageFile).toString('base64');
      
      const request = {
        name: this.processorName,
        rawDocument: {
          content: encodedImage,
          mimeType: mimeType
        },
      };

      const [result] = await documentAI.processDocument(request);
      
      return {
        fullText: result.document.text,
        formFields: this.extractFormFields(result.document),
        entities: this.extractEntities(result.document),
        processingMethod: 'Document AI'
      };
    } catch (error) {
      console.error('Document AI processing failed:', error.message);
      return this.basicTextExtraction(filePath);
    }
  }

  basicTextExtraction(filePath) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      return {
        fullText: fileContent,
        formFields: [],
        entities: [],
        processingMethod: 'Basic Text Extraction'
      };
    } catch (error) {
      console.error('Basic text extraction failed:', error);
      return {
        fullText: '',
        formFields: [],
        entities: [],
        processingMethod: 'Failed'
      };
    }
  }

  extractFormFields(document) {
    const fields = [];
    document.pages?.forEach(page => {
      page.formFields?.forEach(field => {
        const fieldName = this.getTextFromAnchor(field.fieldName?.textAnchor, document.text);
        const fieldValue = this.getTextFromAnchor(field.fieldValue?.textAnchor, document.text);
        
        fields.push({
          field: fieldName.trim(),
          value: fieldValue.trim(),
          confidence: field.fieldName?.confidence || 0
        });
      });
    });
    return fields;
  }

  extractEntities(document) {
    const entities = [];
    document.entities?.forEach(entity => {
      entities.push({
        type: entity.type,
        mention: entity.mentionText,
        confidence: entity.confidence
      });
    });
    return entities;
  }

  getTextFromAnchor(textAnchor, fullText) {
    if (!textAnchor?.textSegments?.length) return '';
    const segment = textAnchor.textSegments[0];
    return fullText.substring(segment.startIndex || 0, segment.endIndex);
  }
}

// Cloud Storage Service
class CloudStorageService {
  async uploadDocument(filePath, fileName, metadata = {}) {
    if (!bucket) {
      console.log('☁️ Cloud Storage not available - using local storage');
      return { 
        fileName, 
        url: `http://localhost:${PORT}/uploads/${fileName}`,
        storage: 'local' 
      };
    }

    try {
      console.log('☁️ Uploading to Google Cloud Storage...');
      
      const destination = `healthcare-docs/${Date.now()}-${fileName}`;
      
      await bucket.upload(filePath, {
        destination,
        metadata: {
          metadata: {
            ...metadata,
            uploadDate: new Date().toISOString(),
            hipaaCompliant: 'true'
          }
        }
      });

      // Generate signed URL for secure access
      const [url] = await bucket.file(destination).getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      });

      return {
        fileName: destination,
        url,
        storage: 'google-cloud'
      };
    } catch (error) {
      console.error('Cloud Storage upload failed:', error.message);
      return { 
        fileName, 
        url: `http://localhost:${PORT}/uploads/${fileName}`,
        storage: 'local-fallback' 
      };
    }
  }
}

// Initialize services
const geminiService = new GeminiService();
const documentProcessor = new HealthcareDocumentProcessor();
const storageService = new CloudStorageService();

// Enhanced document processing function
async function processDocumentAdvanced(filePath, originalName, mimeType) {
  try {
    console.log(`📄 Processing document: ${originalName}`);
    
    // Step 1: Process with Document AI or basic extraction
    const documentData = await documentProcessor.processDocument(filePath, mimeType);
    
    // Step 2: Upload to cloud storage
    const storageResult = await storageService.uploadDocument(filePath, originalName, {
      documentType: 'healthcare-requirements',
      processingMethod: documentData.processingMethod
    });
    
    // Step 3: Extract requirements from processed text
    const requirements = extractRequirements(documentData.fullText);
    
    return {
      filename: originalName,
      requirements,
      documentType: path.extname(originalName).toLowerCase(),
      processedAt: new Date().toISOString(),
      processingMethod: documentData.processingMethod,
      formFields: documentData.formFields,
      entities: documentData.entities,
      storageInfo: storageResult
    };
  } catch (error) {
    console.error('Advanced document processing error:', error);
    return {
      filename: originalName,
      requirements: [],
      documentType: path.extname(originalName).toLowerCase(),
      processedAt: new Date().toISOString(),
      error: error.message
    };
  }
}

function extractRequirements(text) {
  const requirements = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  lines.forEach((line, index) => {
    if (line.length > 20 && (
      line.toLowerCase().includes('shall') ||
      line.toLowerCase().includes('must') ||
      line.toLowerCase().includes('should') ||
      line.toLowerCase().includes('requirement') ||
      line.toLowerCase().includes('system') ||
      line.toLowerCase().includes('user') ||
      line.toLowerCase().includes('patient') ||
      line.toLowerCase().includes('provider') ||
      line.toLowerCase().includes('data') ||
      line.toLowerCase().includes('security') ||
      line.toLowerCase().includes('privacy')
    )) {
      requirements.push({
        id: `REQ${String(index + 1).padStart(3, '0')}`,
        text: line.trim(),
        category: line.toLowerCase().includes('security') ? 'security' :
                 line.toLowerCase().includes('patient') ? 'privacy' :
                 line.toLowerCase().includes('auth') ? 'authentication' : 
                 line.toLowerCase().includes('data') ? 'data-management' : 'functional',
        risk: line.toLowerCase().includes('critical') || line.toLowerCase().includes('security') ? 'high' : 'medium'
      });
    }
  });

  return requirements.slice(0, 15); // Limit for demo
}

// API Routes

// Health check with service status
app.get('/health', (req, res) => {
  const services = ['Express Server'];
  if (geminiService.genAI) services.push('Gemini AI');
  if (documentAI) services.push('Document AI');
  if (cloudStorage) services.push('Cloud Storage');
  if (speechClient) services.push('Speech-to-Text');
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    project: process.env.GOOGLE_CLOUD_PROJECT || 'pro-variety-472211-b9',
    services: services
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    geminiAvailable: !!geminiService.genAI,
    documentAIAvailable: !!documentAI,
    cloudStorageAvailable: !!cloudStorage,
    speechAvailable: !!speechClient,
    timestamp: new Date().toISOString()
  });
});

// Enhanced workflow endpoint
app.post('/api/workflow/complete', upload.single('document'), async (req, res) => {
  try {
    const { methodology = 'agile', complianceFramework = 'HIPAA' } = req.body;
    
    console.log(`🚀 Processing workflow: ${methodology} methodology, ${complianceFramework} compliance`);
    
    let extractedData;
    let requirements = [];

    // Process uploaded document
    if (req.file) {
      console.log(`📄 Processing uploaded file: ${req.file.originalname}`);
      
      const mimeType = req.file.mimetype || 'application/pdf';
      extractedData = await processDocumentAdvanced(req.file.path, req.file.originalname, mimeType);
      requirements = extractedData.requirements.map(req => req.text);
      
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
    } else {
      // Use default requirements if no file uploaded
      requirements = [
        'User authentication must be secure and HIPAA compliant',
        'Patient data must be encrypted during transmission and storage',
        'System must provide audit logging for all PHI access',
        'Role-based access control must be implemented',
        'Data backup and recovery procedures must be tested',
        'Patient consent must be obtained before data processing',
        'System must support multi-factor authentication',
        'Data retention policies must comply with healthcare regulations'
      ];
      
      extractedData = {
        filename: 'default-requirements.txt',
        requirements: requirements.map((req, index) => ({
          id: `REQ${String(index + 1).padStart(3, '0')}`,
          text: req,
          category: 'functional',
          risk: 'medium'
        })),
        documentType: '.txt',
        processedAt: new Date().toISOString(),
        processingMethod: 'Default Dataset'
      };
    }

    console.log(`📋 Found ${requirements.length} requirements`);

    // Generate test cases using AI
    const prompt = `Generate comprehensive healthcare test cases for ${methodology} methodology with ${complianceFramework} compliance. Requirements: ${requirements.join(', ')}`;
    
    const aiResponse = await geminiService.generateContent(prompt);
    
    console.log(`🧪 Generated ${aiResponse.testCases?.length || 0} test cases`);

    res.json({
      success: true,
      methodology,
      complianceFramework,
      extractedData,
      testCases: aiResponse,
      processedAt: new Date().toISOString(),
      serviceStatus: {
        documentAI: !!documentAI,
        cloudStorage: !!cloudStorage,
        geminiAI: !!geminiService.genAI
      }
    });

  } catch (error) {
    console.error('❌ Workflow error:', error);
    
    // Clean up file on error
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.error('File cleanup error:', e);
      }
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Enhanced export endpoint
app.post('/api/tests/export', (req, res) => {
  try {
    const { testCases = [], format = 'csv' } = req.body;
    
    console.log(`Exporting ${testCases.length} test cases as ${format}`);
    
    let exportData, filename, mimeType;
    const timestamp = new Date().toISOString().split('T')[0];
    
    if (format.toLowerCase() === 'csv') {
      // FULL CSV with all 12 columns
      const csvHeaders = [
        'Test ID', 'Test Name', 'Category', 'Priority', 'Description', 
        'Testing Technique', 'Risk Level', 'Compliance Requirements', 
        'Automation Potential', 'Preconditions', 'Test Steps', 'Expected Results'
      ];
      
      const csvRows = testCases.map(test => [
        test.testId || `TC${Math.floor(Math.random() * 1000)}`,
        test.testName || 'Generated Test Case',
        test.category || 'functional',
        test.priority || 'Medium',
        (test.description || 'AI-generated healthcare test case').replace(/"/g, '""'),
        test.testingTechnique || 'functional-testing',
        test.riskLevel || 'Medium',
        (test.complianceRequirements || ['HIPAA']).join('; '),
        test.automationPotential || 'Medium',
        (test.preconditions || ['System operational']).join('; '),
        (test.testSteps || ['Execute test procedure']).join('; '),
        (test.expectedResults || ['System functions as expected']).join('; ')
      ]);
      
      exportData = [csvHeaders, ...csvRows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
      
      filename = `medtestai-testcases-comprehensive-${timestamp}.csv`;
      mimeType = 'text/csv';
    }

    res.json({
      success: true,
      data: exportData,
      filename,
      mimeType,
      exportedCount: testCases.length,
      format
    });

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Audio transcription endpoint (Speech-to-Text)
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  if (!speechClient) {
    return res.status(503).json({
      success: false,
      error: 'Speech-to-Text service not available'
    });
  }

  try {
    const audioBytes = fs.readFileSync(req.file.path).toString('base64');
    
    const request = {
      audio: { content: audioBytes },
      config: {
        encoding: 'WEBM_OPUS',
        sampleRateHertz: 16000,
        languageCode: 'en-US',
        model: 'medical_conversation',
        useEnhanced: true,
      },
    };
    
    const [response] = await speechClient.recognize(request);
    const transcript = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');
    
    // Clean up audio file
    fs.unlinkSync(req.file.path);
    
    res.json({
      success: true,
      transcript,
      confidence: response.results[0]?.alternatives[0]?.confidence || 0
    });
    
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 MedTestAI Backend running on http://localhost:${PORT}`);
  console.log(`🔗 Frontend should connect to: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🤖 Gemini AI: ${geminiService.genAI ? 'READY ✅' : 'MOCK MODE ⚠️'}`);
  console.log(`📄 Document AI: ${documentAI ? 'READY ✅' : 'NOT CONFIGURED ⚠️'}`);
  console.log(`☁️ Cloud Storage: ${cloudStorage ? 'READY ✅' : 'NOT CONFIGURED ⚠️'}`);
  console.log(`🎤 Speech-to-Text: ${speechClient ? 'READY ✅' : 'NOT CONFIGURED ⚠️'}`);
  console.log(`📋 Ready for healthcare test generation!`);
});

export default app;