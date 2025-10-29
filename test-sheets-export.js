// test-sheets-export.js - Quick test for Google Sheets export
import dotenv from 'dotenv';
import googleSheetsService from './services/google-sheets.js';

dotenv.config();

const sampleTestCases = [
  {
    testId: 'TC001',
    testName: 'Patient Login Authentication',
    description: 'Verify that patients can log in with valid credentials',
    priority: 'High',
    category: 'Security',
    testSteps: [
      'Navigate to login page',
      'Enter valid username',
      'Enter valid password',
      'Click login button'
    ],
    expectedResults: [
      'User is redirected to dashboard',
      'User session is created',
      'Audit log entry is created'
    ],
    complianceRequirements: [
      'HIPAA Security Rule - Access Control',
      'HIPAA Privacy Rule - Authentication'
    ]
  },
  {
    testId: 'TC002',
    testName: 'PHI Data Encryption Verification',
    description: 'Verify that all PHI data is encrypted at rest',
    priority: 'High',
    category: 'Security',
    testSteps: [
      'Access patient record',
      'Check database storage',
      'Verify encryption algorithm',
      'Validate encryption keys'
    ],
    expectedResults: [
      'Data is encrypted using AES-256',
      'Encryption keys are properly managed',
      'No plain text PHI in database'
    ],
    complianceRequirements: [
      'HIPAA Security Rule - Encryption',
      'HIPAA Security Rule - Data Protection'
    ]
  }
];

async function testGoogleSheets() {
  console.log('🧪 [TEST] Starting Google Sheets Export Test');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Initialize
    console.log('\n📝 [TEST] Step 1: Initializing Google Sheets service...');
    await googleSheetsService.initialize();
    console.log('✅ [TEST] Initialization successful!');
    
    // Step 2: Export test cases
    console.log('\n📊 [TEST] Step 2: Exporting sample test cases...');
    console.log(`📊 [TEST] Test cases to export: ${sampleTestCases.length}`);
    
    const result = await googleSheetsService.exportTestCases(sampleTestCases);
    
    // Step 3: Display results
    console.log('\n✅ [TEST] Step 3: Export successful!');
    console.log('=' .repeat(60));
    console.log('📊 RESULTS:');
    console.log(`   Rows updated: ${result.updatedRows}`);
    console.log(`   Sheet URL: ${result.sheetUrl}`);
    console.log('=' .repeat(60));
    
    console.log('\n🎉 [TEST] All tests passed!');
    console.log('👉 [TEST] Open the sheet URL above to view your exported test cases');
    
  } catch (error) {
    console.error('\n❌ [TEST] Test failed!');
    console.error('=' .repeat(60));
    console.error('Error:', error.message);
    console.error('\nFull error:', error);
    console.error('=' .repeat(60));
    
    console.log('\n🔍 [TEST] Troubleshooting tips:');
    console.log('   1. Check that GOOGLE_SHEETS_SPREADSHEET_ID is set in .env');
    console.log('   2. Verify medtestai-sa-key.json exists in root directory');
    console.log('   3. Ensure service account has Editor role');
    console.log('   4. Confirm Google Sheets API is enabled');
  }
}

// Run the test
testGoogleSheets();