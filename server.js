// server.js - Complete integration with Google Sheets
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Import services
import documentProcessor from './services/documentProcessor.js';
import testCaseGenerator from './services/testCaseGenerator.js';
import googleSheetsService from './services/google-sheets.js';

// ES modules compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

// ==================== INITIALIZATION ====================
console.log('🚀 [SERVER] Starting MedTestAI Backend Server...');
console.log('=' .repeat(80));

// Initialize services on startup
(async () => {
  try {
    console.log('📝 [SERVER] Initializing services...');
    
    // Initialize test case generator
    await testCaseGenerator.initialize();
    
    // Initialize Google Sheets service
    await googleSheetsService.initialize();
    
    console.log('✅ [SERVER] All services initialized successfully');
    console.log('=' .repeat(80));
  } catch (error) {
    console.error('❌ [SERVER] Service initialization failed:', error);
    console.error('=' .repeat(80));
  }
})();

// ==================== HEALTH CHECK ====================
app.get('/health', (req, res) => {
  console.log('💓 [HEALTH] Health check request received');
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      documentProcessor: 'ready',
      testCaseGenerator: 'ready',
      googleSheets: 'ready'
    }
  });
});

// ==================== DOCUMENT PROCESSING ====================
app.post('/api/process-document', upload.single('document'), async (req, res) => {
  const startTime = Date.now();
  console.log('\n' + '='.repeat(80));
  console.log('📄 [PROCESS] DOCUMENT PROCESSING REQUEST');
  console.log('='.repeat(80));
  console.log(`📄 [PROCESS] File: ${req.file?.originalname}`);
  console.log(`📄 [PROCESS] Size: ${(req.file?.size / 1024).toFixed(2)} KB`);
  
  try {
    if (!req.file) {
      throw new Error('No file uploaded');
    }

    console.log('📝 [PROCESS] Reading file buffer...');
    const fileBuffer = await fs.readFile(req.file.path);
    
    console.log('🤖 [PROCESS] Processing with Document AI...');
    const result = await documentProcessor.processDocument(
      fileBuffer,
      req.file.originalname,
      req.file.mimetype
    );

    // Clean up uploaded file
    await fs.remove(req.file.path);
    
    const duration = Date.now() - startTime;
    console.log(`✅ [PROCESS] Document processing complete in ${duration}ms`);
    console.log('='.repeat(80) + '\n');
    
    res.json({
      success: true,
      extractedText: result.text,
      pages: result.pages,
      processingTime: duration
    });
    
  } catch (error) {
    console.error('❌ [PROCESS] Document processing failed:', error);
    console.error('='.repeat(80) + '\n');
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== TEST CASE GENERATION ====================
app.post('/api/generate-tests', async (req, res) => {
  const startTime = Date.now();
  console.log('\n' + '='.repeat(80));
  console.log('🧪 [GENERATE] TEST CASE GENERATION REQUEST');
  console.log('='.repeat(80));
  
  try {
    const { requirements, methodology, compliance } = req.body;
    
    console.log(`📋 [GENERATE] Requirements: ${requirements?.length || 0}`);
    console.log(`🔧 [GENERATE] Methodology: ${methodology || 'agile'}`);
    console.log(`🔒 [GENERATE] Compliance: ${compliance || 'HIPAA'}`);
    
    if (!requirements || requirements.length === 0) {
      throw new Error('No requirements provided');
    }

    const testCases = await testCaseGenerator.generateTestCases(
      requirements,
      methodology || 'agile',
      compliance || 'HIPAA'
    );

    const duration = Date.now() - startTime;
    console.log(`✅ [GENERATE] Generated ${testCases.testCases?.length || 0} test cases in ${duration}ms`);
    console.log('='.repeat(80) + '\n');
    
    res.json({
      success: true,
      testCases,
      processingTime: duration
    });
    
  } catch (error) {
    console.error('❌ [GENERATE] Test generation failed:', error);
    console.error('='.repeat(80) + '\n');
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== EXPORT ENDPOINTS ====================

// CSV Export
app.post('/api/tests/export', async (req, res) => {
  console.log('\n' + '='.repeat(80));
  console.log('📤 [EXPORT] EXPORT REQUEST');
  console.log('='.repeat(80));
  
  try {
    const { testCases, format, methodology, compliance } = req.body;
    
    console.log(`📊 [EXPORT] Format: ${format || 'csv'}`);
    console.log(`📊 [EXPORT] Test cases: ${testCases?.testCases?.length || 0}`);
    
    if (!testCases || !testCases.testCases) {
      throw new Error('No test cases provided');
    }

    let exportData, mimeType, filename;
    const timestamp = new Date().toISOString().split('T')[0];

    switch (format?.toLowerCase()) {
      case 'csv':
        console.log('📊 [EXPORT] Generating CSV...');
        exportData = generateCSV(testCases.testCases);
        mimeType = 'text/csv';
        filename = `medtestai-tests-${timestamp}.csv`;
        break;
        
      case 'json':
        console.log('📊 [EXPORT] Generating JSON...');
        exportData = JSON.stringify(testCases, null, 2);
        mimeType = 'application/json';
        filename = `medtestai-tests-${timestamp}.json`;
        break;
        
      case 'excel':
        console.log('📊 [EXPORT] Generating Excel...');
        exportData = generateExcel(testCases.testCases);
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `medtestai-tests-${timestamp}.xlsx`;
        break;
        
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    console.log(`✅ [EXPORT] Export generated: ${filename}`);
    console.log('='.repeat(80) + '\n');
    
    res.json({
      success: true,
      data: exportData,
      mimeType,
      filename,
      exportedCount: testCases.testCases.length
    });
    
  } catch (error) {
    console.error('❌ [EXPORT] Export failed:', error);
    console.error('='.repeat(80) + '\n');
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== GOOGLE SHEETS EXPORT ====================
app.post('/api/v1/export/google-sheets', async (req, res) => {
  console.log('\n' + '='.repeat(80));
  console.log('📊 [GOOGLE SHEETS] EXPORT REQUEST');
  console.log('='.repeat(80));
  
  try {
    const { testCases, methodology, compliance } = req.body;
    
    console.log(`📊 [GOOGLE SHEETS] Test cases count: ${testCases?.length || 0}`);
    console.log(`🔧 [GOOGLE SHEETS] Methodology: ${methodology || 'agile'}`);
    console.log(`🔒 [GOOGLE SHEETS] Compliance: ${compliance || 'HIPAA'}`);
    
    if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
      console.log('⚠️  [GOOGLE SHEETS] No test cases provided');
      return res.status(400).json({
        success: false,
        error: 'No test cases to export'
      });
    }

    console.log('📝 [GOOGLE SHEETS] Step 1: Calling Google Sheets service...');
    const result = await googleSheetsService.exportTestCases(testCases);
    
    console.log('✅ [GOOGLE SHEETS] Step 2: Export successful!');
    console.log(`📊 [GOOGLE SHEETS] Updated rows: ${result.updatedRows}`);
    console.log(`🔗 [GOOGLE SHEETS] Sheet URL: ${result.sheetUrl}`);
    console.log('='.repeat(80) + '\n');
    
    res.json({
      success: true,
      message: `Exported ${testCases.length} test cases to Google Sheets`,
      sheetUrl: result.sheetUrl,
      updatedRows: result.updatedRows,
      spreadsheetId: googleSheetsService.spreadsheetId
    });
    
  } catch (error) {
    console.error('❌ [GOOGLE SHEETS] Export failed:', error);
    console.error('❌ [GOOGLE SHEETS] Error details:', error.stack);
    console.error('='.repeat(80) + '\n');
    
    res.status(500).json({
      success: false,
      error: 'Failed to export to Google Sheets',
      details: error.message
    });
  }
});

// Create new Google Sheet
app.post('/api/v1/export/create-sheet', async (req, res) => {
  console.log('\n' + '='.repeat(80));
  console.log('📊 [GOOGLE SHEETS] CREATE NEW SHEET REQUEST');
  console.log('='.repeat(80));
  
  try {
    console.log('📝 [GOOGLE SHEETS] Creating new spreadsheet...');
    const result = await googleSheetsService.createTestManagementSheet();
    
    console.log(`✅ [GOOGLE SHEETS] New sheet created!`);
    console.log(`🔗 [GOOGLE SHEETS] Sheet URL: ${result.url}`);
    console.log(`📋 [GOOGLE SHEETS] Sheet ID: ${result.spreadsheetId}`);
    console.log('='.repeat(80) + '\n');
    
    res.json({
      success: true,
      spreadsheetId: result.spreadsheetId,
      url: result.url
    });
    
  } catch (error) {
    console.error('❌ [GOOGLE SHEETS] Sheet creation failed:', error);
    console.error('='.repeat(80) + '\n');
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== HELPER FUNCTIONS ====================

function generateCSV(testCases) {
  console.log('📝 [CSV] Generating CSV data...');
  
  const headers = [
    'Test ID', 'Test Name', 'Category', 'Priority', 'Description',
    'Preconditions', 'Test Steps', 'Expected Results', 'Compliance Requirements'
  ];
  
  const rows = testCases.map(tc => [
    tc.testId || '',
    tc.testName || '',
    tc.category || '',
    tc.priority || '',
    tc.description || '',
    Array.isArray(tc.preconditions) ? tc.preconditions.join('; ') : '',
    Array.isArray(tc.testSteps) ? tc.testSteps.map((s, i) => `${i + 1}. ${s.action || s}`).join(' | ') : '',
    Array.isArray(tc.expectedResults) ? tc.expectedResults.join('; ') : tc.expectedResult || '',
    Array.isArray(tc.complianceRequirements) ? tc.complianceRequirements.join('; ') : ''
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  
  console.log(`✅ [CSV] Generated ${rows.length} rows`);
  return csvContent;
}

function generateExcel(testCases) {
  console.log('📝 [EXCEL] Generating Excel data...');
  // Simplified Excel generation - you can enhance this with a library like xlsx
  return generateCSV(testCases);
}

// ==================== ERROR HANDLING ====================
app.use((err, req, res, next) => {
  console.error('❌ [ERROR] Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 [SERVER] MEDTESTAI BACKEND SERVER STARTED');
  console.log('='.repeat(80));
  console.log(`✅ [SERVER] Server running on port ${PORT}`);
  console.log(`🌐 [SERVER] API URL: http://localhost:${PORT}`);
  console.log(`📊 [SERVER] Google Sheets: ${googleSheetsService.spreadsheetId ? 'Configured' : 'Not Configured'}`);
  console.log(`🔒 [SERVER] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(80));
  console.log('\n📝 [SERVER] Available Endpoints:');
  console.log('   GET  /health                          - Health check');
  console.log('   POST /api/process-document            - Process healthcare documents');
  console.log('   POST /api/generate-tests              - Generate test cases');
  console.log('   POST /api/tests/export                - Export (CSV/JSON/Excel)');
  console.log('   POST /api/v1/export/google-sheets     - Export to Google Sheets');
  console.log('   POST /api/v1/export/create-sheet      - Create new Google Sheet');
  console.log('='.repeat(80) + '\n');
});

export default app;