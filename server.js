// server.js - FIXED WITH SERVICE INITIALIZATION
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import documentProcessor from './services/documentProcessor.js';
import testCaseGeneratorMultiCompliance from './services/testCaseGeneratorMultiCompliance.js';
import WebhookManager from './services/WebhookManager.js';
import GoogleDriveService from './services/GoogleDriveService.js';
import { asyncHandler, errorHandler } from './middleware/errorHandler.js';
import googleSheets from './services/google-sheets.js';
import GoogleDriveExport from './services/GoogleDriveExport.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// File upload
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 20 * 1024 * 1024 }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    features: {
      webhooks: true,
      googleDrive: true,
      chromeExtension: true,
      multiCompliance: true,
      vertexAI: true
    }
  });
});

// ==================== WEBHOOK ENDPOINTS ====================

// Register webhook
app.post('/api/webhooks/register', asyncHandler(async (req, res) => {
  const { url, events, secret } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  
  const webhook = WebhookManager.registerWebhook({
    url,
    events: events || ['test.generated', 'document.processed'],
    secret
  });
  
  res.json({
    success: true,
    webhook
  });
}));

// List webhooks
app.get('/api/webhooks', (req, res) => {
  const webhooks = WebhookManager.getAllWebhooks();
  res.json({ success: true, webhooks });
});

// Get webhook details
app.get('/api/webhooks/:id', (req, res) => {
  const webhook = WebhookManager.getWebhook(req.params.id);
  if (!webhook) {
    return res.status(404).json({ error: 'Webhook not found' });
  }
  res.json({ success: true, webhook });
});

// Update webhook
app.patch('/api/webhooks/:id', asyncHandler(async (req, res) => {
  const webhook = WebhookManager.updateWebhook(req.params.id, req.body);
  res.json({ success: true, webhook });
}));

// Delete webhook
app.delete('/api/webhooks/:id', (req, res) => {
  const deleted = WebhookManager.deleteWebhook(req.params.id);
  res.json({ success: true, deleted });
});

// Test webhook
app.post('/api/webhooks/:id/test', asyncHandler(async (req, res) => {
  const result = await WebhookManager.testWebhook(req.params.id);
  res.json({ success: true, result });
}));

// Chrome extension endpoint
app.post('/api/webhooks/generate', asyncHandler(async (req, res) => {
  const { requirements, methodology, compliance } = req.body;
  
  if (!requirements) {
    return res.status(400).json({ error: 'Requirements are required' });
  }
  
  const testCases = await testCaseGeneratorMultiCompliance.generateTestCases(
    Array.isArray(requirements) ? requirements : [requirements],
    methodology || 'agile',
    Array.isArray(compliance) ? compliance : [compliance || 'HIPAA']
  );
  
  await WebhookManager.triggerWebhook('test.generated', {
    source: 'chrome-extension',
    testCases: testCases.testCases
  });
  
  res.json({
    success: true,
    testCases: testCases.testCases,
    metadata: testCases.metadata
  });
}));

// ==================== GOOGLE DRIVE ENDPOINTS ====================

app.post('/api/drive/export', asyncHandler(async (req, res) => {
  const { testCases, fileName, methodology, compliance } = req.body;
  
  if (!testCases || testCases.length === 0) {
    return res.status(400).json({ error: 'Test cases are required' });
  }
  
  const result = await GoogleDriveService.exportToDrive({
    testCases,
    fileName: fileName || 'medtestai-export',
    methodology,
    compliance
  });
  
  res.json({
    success: true,
    fileUrl: result.fileUrl,
    fileId: result.fileId
  });
}));

app.get('/api/drive/auth-status', asyncHandler(async (req, res) => {
  const isAuthorized = await GoogleDriveService.isAuthorized();
  res.json({ authorized: isAuthorized });
}));

// ==================== GOOGLE SHEETS EXPORT ====================

app.post('/api/export/google-sheets', asyncHandler(async (req, res) => {
  console.log('ðŸ“Š [Sheets] Export request received');
  
  const { testCases, config } = req.body;
  
  if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Test cases array is required'
    });
  }
  
  const result = await googleSheets.exportTestCases(testCases, config);
  
  res.json({
    success: true,
    spreadsheetUrl: result.spreadsheetUrl,
    spreadsheetId: result.spreadsheetId,
    rowsWritten: result.rowsWritten
  });
}));



// ==================== GOOGLE DRIVE FOLDER EXPORT ====================

// Verify folder access
app.post('/api/drive/verify-folder', asyncHandler(async (req, res) => {
  const { folderId } = req.body;
  
  if (!folderId) {
    return res.status(400).json({
      success: false,
      error: 'Folder ID is required'
    });
  }

  const result = await GoogleDriveExport.verifyFolder(folderId);
  
  res.json({
    success: result.valid,
    folderName: result.folderName,
    error: result.error
  });
}));

// Export to user's Drive folder
app.post('/api/export/drive-folder', asyncHandler(async (req, res) => {
  console.log('ðŸ“ [Drive] Export to folder request received');
  
  const { testCases, folderId, fileName, methodology, compliance } = req.body;
  
  if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Test cases array is required'
    });
  }

  if (!folderId) {
    return res.status(400).json({
      success: false,
      error: 'Google Drive folder ID is required'
    });
  }

  try {
    console.log(`ðŸ“ [Drive] Exporting ${testCases.length} test cases to folder: ${folderId}`);
    
    const result = await GoogleDriveExport.createSheetInFolder(testCases, {
      folderId,
      fileName: fileName || 'MedTestAI Test Cases',
      methodology: methodology || 'agile',
      compliance: compliance || 'HIPAA'
    });

    console.log('âœ… [Drive] Export successful:', result.spreadsheetUrl);

    res.json({
      success: true,
      spreadsheetUrl: result.spreadsheetUrl,
      spreadsheetId: result.spreadsheetId,
      fileName: result.fileName
    });

  } catch (error) {
    console.error('âŒ [Drive] Export failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to export to Google Drive'
    });
  }
}));

// ==================== EXPORT ENDPOINTS ====================

app.post('/api/tests/export', asyncHandler(async (req, res) => {
  console.log('ðŸ“¤ [Export] Export request received');
  
  const { testCases, format, methodology, complianceFrameworks } = req.body;
  
  if (!testCases || testCases.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No test cases provided for export'
    });
  }
  
  console.log(`ðŸ“¤ [Export] Format: ${format}, Test cases: ${testCases.length}`);
  
  try {
    switch (format) {
      case 'csv': {
        const headers = [
          'Test ID',
          'Test Name',
          'Category',
          'Priority',
          'Description',
          'Preconditions',
          'Test Steps',
          'Expected Results',
          'Compliance Requirements',
          'Risk Level'
        ];
        
        const rows = testCases.map(tc => [
          tc.testId || tc.id || '',
          tc.testName || tc.name || tc.title || '',
          tc.category || '',
          tc.priority || 'Medium',
          tc.description || '',
          Array.isArray(tc.preconditions) ? tc.preconditions.join('; ') : tc.preconditions || '',
          Array.isArray(tc.testSteps) ? tc.testSteps.map((s, i) => `${i+1}. ${s.step || s}`).join('\n') : '',
          tc.expectedResults || tc.expected || '',
          Array.isArray(tc.complianceRequirements) ? tc.complianceRequirements.join(', ') : tc.complianceRequirements || '',
          tc.riskLevel || ''
        ]);
        
        const csv = [headers, ...rows]
          .map(row => row.map(cell => {
            const cellStr = String(cell).replace(/"/g, '""');
            return `"${cellStr}"`;
          }).join(','))
          .join('\n');
        
        console.log(`âœ… [Export] CSV generated - ${rows.length} rows`);
        
        res.json({
          success: true,
          data: csv,
          filename: `medtestai-testcases-${methodology || 'export'}-${Date.now()}.csv`,
          mimeType: 'text/csv',
          count: rows.length
        });
        break;
      }

      case 'json': {
        const exportData = {
          metadata: {
            exportDate: new Date().toISOString(),
            methodology: methodology || 'agile',
            complianceFrameworks: complianceFrameworks || [],
            totalTests: testCases.length
          },
          testCases: testCases
        };
        
        console.log(`âœ… [Export] JSON generated - ${testCases.length} test cases`);
        
        res.json({
          success: true,
          data: JSON.stringify(exportData, null, 2),
          filename: `medtestai-testcases-${methodology || 'export'}-${Date.now()}.json`,
          mimeType: 'application/json',
          count: testCases.length
        });
        break;
      }

      case 'excel': {
        console.log('ðŸ“Š [Export] Generating Excel CSV format...');
        
        const headers = [
          'Test ID',
          'Test Name',
          'Category',
          'Priority',
          'Description',
          'Preconditions',
          'Test Steps',
          'Expected Results',
          'Compliance Requirements',
          'Risk Level',
          'Testing Technique',
          'Automation Feasibility'
        ];
        
        const rows = testCases.map(tc => [
          tc.testId || tc.id || '',
          tc.testName || tc.name || tc.title || '',
          tc.category || '',
          tc.priority || 'Medium',
          tc.description || '',
          Array.isArray(tc.preconditions) ? tc.preconditions.join('; ') : tc.preconditions || '',
          Array.isArray(tc.testSteps) ? 
            tc.testSteps.map((s, i) => {
              if (typeof s === 'object' && s.action) {
                return `Step ${s.step || i+1}: ${s.action}`;
              }
              return `${i+1}. ${s.step || s}`;
            }).join('\n') : '',
          tc.expectedResults || tc.expected || '',
          Array.isArray(tc.complianceRequirements) ? 
            tc.complianceRequirements.join(', ') : 
            tc.complianceRequirements || '',
          tc.riskLevel || '',
          tc.testingTechnique || '',
          tc.automationFeasibility || ''
        ]);
        
        const csv = [headers, ...rows]
          .map(row => row.map(cell => {
            const cellStr = String(cell).replace(/"/g, '""');
            return `"${cellStr}"`;
          }).join(','))
          .join('\n');
        
        console.log(`âœ… [Export] Excel CSV generated - ${rows.length} rows`);
        
        res.json({
          success: true,
          data: csv,
          filename: `medtestai-testcases-excel-${Date.now()}.csv`,
          mimeType: 'text/csv',
          count: rows.length
        });
        break;
      }

      default:
        console.error(`âŒ [Export] Unsupported format: ${format}`);
        return res.status(400).json({
          success: false,
          error: `Unsupported export format: ${format}`
        });
    }

    console.log(`âœ… [Export] Export successful - Format: ${format}`);
    
  } catch (error) {
    console.error(`âŒ [Export] Export failed:`, error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message || 'Export failed'
    });
  }
}));

// ==================== EXISTING ENDPOINTS (FIXED) ====================

// Process document
app.post('/api/process-document', upload.single('document'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const result = await documentProcessor.processDocument(
    req.file.path,
    req.file.originalname
  );
  
  // Trigger webhooks
  await WebhookManager.triggerWebhook('document.processed', {
    fileName: req.file.originalname,
    requirements: result.requirements
  });
  
  res.json(result);
}));

// Regenerate tests (FIXED)
app.post('/api/workflow/regenerate', asyncHandler(async (req, res) => {
  console.log('ðŸ”„ [Regenerate] Request received');
  
  const { requirements, methodology, complianceFrameworks } = req.body;
  
  if (!requirements || !Array.isArray(requirements)) {
    return res.status(400).json({
      success: false,
      error: 'Requirements array is required'
    });
  }

  console.log(`ðŸ“‹ [Regenerate] Processing ${requirements.length} requirements`);
  console.log(`ðŸ”§ [Regenerate] Methodology: ${methodology || 'agile'}`);
  console.log(`ðŸ›¡ï¸ [Regenerate] Compliance: ${complianceFrameworks?.join(', ') || 'HIPAA'}`);

  try {
    // Normalize compliance frameworks
    const frameworks = Array.isArray(complianceFrameworks) 
      ? complianceFrameworks 
      : (complianceFrameworks ? [complianceFrameworks] : ['hipaa']);

    // Map requirements to text strings
    const requirementTexts = requirements.map(req => {
      if (typeof req === 'string') {
        return req;
      } else if (req && typeof req === 'object') {
        return req.text || req.requirement || req.description || String(req);
      }
      return String(req);
    }).filter(text => text && text.trim().length > 0);

    if (requirementTexts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid requirement texts found'
      });
    }

    console.log('ðŸ“¤ [Regenerate] Calling test generator...');
    
    // Generate test cases using the multi-compliance generator
    const result = await testCaseGeneratorMultiCompliance.generateTestCases(
      requirementTexts,
      methodology || 'agile',
      frameworks
    );

    console.log('âœ… [Regenerate] Test generation successful');
    console.log(`ðŸ“Š [Regenerate] Generated ${result.testCases?.length || 0} test cases`);

    // Validate response structure
    if (!result || typeof result !== 'object') {
      throw new Error('Invalid response from test generator');
    }

    if (!result.testCases || !Array.isArray(result.testCases)) {
      throw new Error('Test generator did not return test cases array');
    }

    // Return success response with consistent structure
    res.json({
      success: true,
      data: {
        testCases: result.testCases,
        metadata: result.metadata || {
          methodology: methodology || 'agile',
          complianceFrameworks: frameworks,
          generatedAt: new Date().toISOString()
        },
        summary: result.summary || {
          totalTests: result.testCases.length,
          byPriority: {},
          byCategory: {}
        }
      },
      message: `Successfully generated ${result.testCases.length} test cases`
    });

  } catch (error) {
    console.error('âŒ [Regenerate] Error:', error);
    console.error('âŒ [Regenerate] Stack:', error.stack);
    
    // Return detailed error for debugging
    res.status(500).json({
      success: false,
      error: error.message || 'Test generation failed',
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 3)
      } : undefined
    });
  }
}));

app.post('/api/workflow/complete', upload.single('document'), asyncHandler(async (req, res) => {
  console.log('ðŸ“„ [Workflow] Complete workflow request received');
  
  if (!req.file) {
    return res.status(400).json({ 
      success: false, 
      error: 'No file uploaded' 
    });
  }
  
  try {
    // Extract parameters
    const methodology = req.body.methodology || 'agile';
    let complianceFrameworks = [];
    
    // Handle compliance frameworks from FormData
    if (req.body['complianceFrameworks[]']) {
      // Can be array or single value
      if (Array.isArray(req.body['complianceFrameworks[]'])) {
        complianceFrameworks = req.body['complianceFrameworks[]'];
      } else {
        complianceFrameworks = [req.body['complianceFrameworks[]']];
      }
    } else if (req.body.complianceFrameworks) {
      complianceFrameworks = Array.isArray(req.body.complianceFrameworks) 
        ? req.body.complianceFrameworks 
        : [req.body.complianceFrameworks];
    } else {
      complianceFrameworks = ['hipaa']; // Default
    }
    
    console.log('ðŸ“‹ [Workflow] Configuration:');
    console.log('   File:', req.file.originalname);
    console.log('   Size:', req.file.size);
    console.log('   Methodology:', methodology);
    console.log('   Compliance:', complianceFrameworks.join(', '));
    
    // Step 1: Process document
    console.log('ðŸ“„ [Workflow] Step 1: Processing document...');
    const documentResult = await documentProcessor.processDocument(
      req.file.path,
      req.file.originalname
    );
    
    console.log(`âœ… [Workflow] Document processed: ${documentResult.requirements.length} requirements`);
    console.log(`   Method: ${documentResult.processingMethod}`);
    
    // Validate requirements
    if (!documentResult.requirements || documentResult.requirements.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No requirements found in document',
        details: {
          fileName: req.file.originalname,
          processingMethod: documentResult.processingMethod,
          suggestion: 'Document may be empty or in unsupported format'
        }
      });
    }
    
    // Step 2: Generate test cases
    console.log('ðŸ§ª [Workflow] Step 2: Generating test cases...');
    
    // Map requirements to text array
    const requirementTexts = documentResult.requirements.map(req => {
      if (typeof req === 'string') {
        return req;
      } else if (req && typeof req === 'object' && req.text) {
        return req.text;
      } else {
        return String(req);
      }
    }).filter(text => text && text.trim().length > 0);
    
    console.log(`   Processing ${requirementTexts.length} valid requirements`);
    
    const testResult = await testCaseGeneratorMultiCompliance.generateTestCases(
      requirementTexts,
      methodology,
      complianceFrameworks
    );
    
    console.log(`âœ… [Workflow] Generated ${testResult.testCases?.length || 0} test cases`);
    
    // Validate test results
    if (!testResult || !testResult.testCases || testResult.testCases.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'Test generation failed',
        details: {
          documentProcessed: true,
          requirementsFound: requirementTexts.length,
          testCasesGenerated: 0,
          suggestion: 'Check Vertex AI configuration and service account credentials'
        }
      });
    }
    
    // Step 3: Trigger webhooks
    try {
      await WebhookManager.triggerWebhook('document.processed', {
        fileName: req.file.originalname,
        requirements: documentResult.requirements
      });
      
      await WebhookManager.triggerWebhook('test.generated', {
        testCases: testResult.testCases,
        summary: testResult.summary
      });
    } catch (webhookError) {
      console.warn('âš ï¸  [Workflow] Webhook trigger failed:', webhookError.message);
      // Continue anyway - webhooks are non-critical
    }
    
    // Step 4: Build comprehensive response
    const response = {
      success: true,
      message: `Successfully processed ${req.file.originalname} and generated ${testResult.testCases.length} test cases`,
      
      // Document processing results
      extractedData: {
        requirements: documentResult.requirements,
        fileName: req.file.originalname,
        documentType: documentResult.documentType,
        processedAt: documentResult.processedAt,
        processingMethod: documentResult.processingMethod,
        text: documentResult.text // Full document text
      },
      
      // Test generation results
      testCases: testResult.testCases,
      
      // Metadata
      metadata: {
        methodology: methodology,
        complianceFrameworks: complianceFrameworks,
        generatedAt: new Date().toISOString(),
        requirementCount: documentResult.requirements.length,
        testCaseCount: testResult.testCases.length,
        ...testResult.metadata
      },
      
      // Summary statistics
      summary: testResult.summary || {
        totalTests: testResult.testCases.length,
        byPriority: {},
        byCategory: {},
        complianceCoverage: {}
      },
      
      // Service status
      serviceStatus: documentResult.serviceStatus || {
        documentAI: false,
        cloudStorage: false,
        geminiAI: true,
        vertexAI: true
      }
    };
    
    console.log('âœ… [Workflow] Complete workflow successful');
    console.log(`   ${documentResult.requirements.length} requirements â†’ ${testResult.testCases.length} test cases`);
    
    res.json(response);
    
  } catch (error) {
    console.error('âŒ [Workflow] Complete workflow failed:', error);
    console.error('   Stack:', error.stack);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Workflow processing failed',
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5),
        file: req.file?.originalname
      } : undefined
    });
  }
}));

app.post('/api/export/google-sheets', asyncHandler(async (req, res) => {
  const { testCases, config } = req.body;
  if (!testCases || testCases.length === 0) {
    return res.status(400).json({ success: false, error: 'No test cases' });
  }
  const result = await GoogleSheetsService.exportToSheets(testCases, config);
  res.json({ success: true, spreadsheetUrl: result.spreadsheetUrl, 
    spreadsheetId: result.spreadsheetId, rowsWritten: result.rowsWritten });
}));

// Error handler
app.use(errorHandler);

// ==================== SERVICE INITIALIZATION ====================
async function initializeServices() {
  console.log('\nðŸ”§ [Init] Initializing MedTestAI services...');
  console.log('=' .repeat(60));
  
  try {
    // Initialize test generator (Vertex AI)
    console.log('ðŸ¤– [Init] Initializing Test Generator (Vertex AI)...');
    await testCaseGeneratorMultiCompliance.initialize();
    console.log('âœ… [Init] Test generator ready');
    
    // Initialize document processor if needed
    if (documentProcessor.initialize) {
      console.log('ðŸ“„ [Init] Initializing Document Processor...');
      await documentProcessor.initialize();
      console.log('âœ… [Init] Document processor ready');
    }
    
    console.log('=' .repeat(60));
    console.log('âœ… [Init] All services initialized successfully\n');
    return true;
  } catch (error) {
    console.error('âŒ [Init] Service initialization failed:', error);
    console.error('   Error:', error.message);
    console.error('   Stack:', error.stack?.split('\n').slice(0, 3));
    console.error('\nâš ï¸  Server will start but AI features may not work');
    console.error('   Check your .env file and service account credentials\n');
    return false;
  }
}

// ==================== START SERVER ====================
(async () => {
  // Initialize services before starting server
  await initializeServices();
  
  // Start Express server
  const server = app.listen(PORT, () => {
    console.log('ðŸš€ MedTestAI Server Started');
    console.log('=' .repeat(60));
    console.log(`ðŸ“ Port: ${PORT}`);
    console.log(`ðŸŒ Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`ðŸ“¦ Project: ${process.env.GOOGLE_CLOUD_PROJECT || 'not configured'}`);
    console.log('\nâœ… Enabled Features:');
    console.log('   â€¢ Vertex AI (Gemini)');
    console.log('   â€¢ Multi-compliance testing');
    console.log('   â€¢ Document processing');
    console.log('   â€¢ Webhooks');
    console.log('   â€¢ Google Drive integration');
    console.log('   â€¢ Chrome Extension API');
    console.log('   â€¢ Google Sheets export');
    console.log('=' .repeat(60));
    console.log('ðŸŽ‰ Server ready to accept requests!\n');
  });

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('\nâš ï¸  SIGTERM received, shutting down gracefully...');
    server.close(() => {
      console.log('âœ… Server closed');
      process.exit(0);
    });
  });
})();

export default app;


