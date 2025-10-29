import express from 'express';
import GoogleSheetsService from '../services/google-sheets.js';

const router = express.Router();

// Export test cases to Google Sheets
router.post('/export-to-sheets', async (req, res) => {
  try {
    const { testCases, createNew } = req.body;

    if (!testCases || !Array.isArray(testCases)) {
      return res.status(400).json({ error: 'testCases array required' });
    }

    // Optionally create new sheet
    let sheetInfo;
    if (createNew) {
      sheetInfo = await GoogleSheetsService.createTestManagementSheet();
      // Update service to use new sheet
      GoogleSheetsService.spreadsheetId = sheetInfo.spreadsheetId;
    }

    const result = await GoogleSheetsService.exportTestCases(testCases);

    res.json({
      success: true,
      ...result,
      ...(sheetInfo && { newSheet: sheetInfo })
    });

  } catch (error) {
    console.error('Sheets export error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Get test cases from Google Sheets
router.get('/get-from-sheets', async (req, res) => {
  try {
    const testCases = await GoogleSheetsService.getTestCases();
    res.json({
      success: true,
      testCases,
      count: testCases.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;