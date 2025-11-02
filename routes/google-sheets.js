// routes/google-sheets.js - Add new configured export endpoint
router.post('/export-configured', async (req, res) => {
  try {
    const { testCases, metadata, config } = req.body;
    
    // Initialize Google Sheets API
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });

    let spreadsheetId;
    
    // Create new or use existing spreadsheet
    if (config.createNewSpreadsheet) {
      const spreadsheet = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: config.spreadsheetName
          }
        }
      });
      spreadsheetId = spreadsheet.data.spreadsheetId;
    } else {
      spreadsheetId = config.existingSpreadsheetId;
    }

    // Prepare data based on grouping
    let groupedData = testCases;
    if (config.groupBy !== 'none') {
      groupedData = groupTestCases(testCases, config.groupBy);
    }

    // Create main test cases sheet
    await createTestCasesSheet(sheets, spreadsheetId, groupedData, config);

    // Create summary dashboard if requested
    if (config.includeSummarySheet) {
      await createSummarySheet(sheets, spreadsheetId, testCases, metadata);
    }

    // Add charts if requested
    if (config.includeCharts) {
      await addCharts(sheets, spreadsheetId, testCases);
    }

    // Apply color coding if requested
    if (config.colorCode) {
      await applyColorCoding(sheets, spreadsheetId);
    }

    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

    res.json({
      success: true,
      spreadsheetId,
      spreadsheetUrl,
      message: 'Google Sheets export completed successfully'
    });

  } catch (error) {
    console.error('Configured export failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper functions
function groupTestCases(testCases, groupBy) {
  const groups = {};
  
  testCases.forEach(test => {
    const key = test[groupBy] || 'Uncategorized';
    if (!groups[key]) groups[key] = [];
    groups[key].push(test);
  });
  
  return groups;
}

async function createTestCasesSheet(sheets, spreadsheetId, data, config) {
  // Implementation for creating formatted test cases sheet
  // ... (detailed sheet creation logic)
}

async function createSummarySheet(sheets, spreadsheetId, testCases, metadata) {
  // Implementation for summary dashboard
  // ... (summary creation logic)
}

async function addCharts(sheets, spreadsheetId, testCases) {
  // Implementation for adding charts
  // ... (chart creation logic)
}

async function applyColorCoding(sheets, spreadsheetId) {
  // Implementation for color coding
  // ... (formatting logic)
}