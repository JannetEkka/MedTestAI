// services/GoogleSheetsService.js - Complete Google Sheets Export Implementation
const { google } = require('googleapis');
const path = require('path');

class GoogleSheetsService {
  constructor() {
    this.auth = null;
    this.sheets = null;
  }

  async initialize() {
    try {
      // Use service account credentials
      const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
                     path.join(__dirname, '../medtestai-sa-key.json');

      this.auth = new google.auth.GoogleAuth({
        keyFile: keyPath,
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive.file'
        ],
      });

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      this.drive = google.drive({ version: 'v3', auth: this.auth });
      
      console.log('✅ [GoogleSheets] Service initialized');
    } catch (error) {
      console.error('❌ [GoogleSheets] Initialization failed:', error);
      throw error;
    }
  }

  async exportToSheets(testCases, config = {}) {
    if (!this.sheets) {
      await this.initialize();
    }

    const {
      title = 'MedTestAI Test Cases',
      methodology = 'agile',
      compliance = 'HIPAA'
    } = config;

    try {
      console.log(`📊 [GoogleSheets] Creating spreadsheet: ${title}`);
      
      // Create spreadsheet
      const spreadsheet = await this.sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: `${title} - ${new Date().toISOString().split('T')[0]}`
          },
          sheets: [
            { properties: { title: 'Test Cases' } },
            { properties: { title: 'Summary' } }
          ]
        }
      });

      const spreadsheetId = spreadsheet.data.spreadsheetId;
      console.log(`✅ [GoogleSheets] Created spreadsheet: ${spreadsheetId}`);

      // Prepare test cases data
      const headers = [
        'Test ID',
        'Test Name',
        'Category',
        'Priority',
        'Description',
        'Preconditions',
        'Test Steps',
        'Expected Results',
        'Compliance',
        'Risk Level',
        'Testing Technique',
        'Automation'
      ];

      const rows = testCases.map(tc => [
        tc.testId || tc.id || '',
        tc.testName || tc.name || '',
        tc.category || '',
        tc.priority || 'Medium',
        tc.description || '',
        Array.isArray(tc.preconditions) ? tc.preconditions.join('\n') : tc.preconditions || '',
        Array.isArray(tc.testSteps) ? 
          tc.testSteps.map((s, i) => {
            if (typeof s === 'object') {
              return `${s.step}. ${s.action}\nExpected: ${s.expectedResult}`;
            }
            return `${i+1}. ${s}`;
          }).join('\n\n') : '',
        tc.expectedResults || tc.expected || '',
        Array.isArray(tc.complianceRequirements) ? 
          tc.complianceRequirements.join(', ') : 
          tc.complianceRequirements || '',
        tc.riskLevel || '',
        tc.testingTechnique || '',
        tc.automationFeasibility || ''
      ]);

      // Write test cases
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Test Cases!A1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers, ...rows]
        }
      });

      // Format test cases sheet
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            // Format header row
            {
              repeatCell: {
                range: {
                  sheetId: 0,
                  startRowIndex: 0,
                  endRowIndex: 1
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.4, green: 0.5, blue: 0.93 },
                    textFormat: {
                      foregroundColor: { red: 1, green: 1, blue: 1 },
                      bold: true,
                      fontSize: 11
                    }
                  }
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat)'
              }
            },
            // Auto-resize columns
            {
              autoResizeDimensions: {
                dimensions: {
                  sheetId: 0,
                  dimension: 'COLUMNS',
                  startIndex: 0,
                  endIndex: headers.length
                }
              }
            },
            // Freeze header row
            {
              updateSheetProperties: {
                properties: {
                  sheetId: 0,
                  gridProperties: {
                    frozenRowCount: 1
                  }
                },
                fields: 'gridProperties.frozenRowCount'
              }
            }
          ]
        }
      });

      // Create summary sheet
      const summaryData = this.createSummary(testCases, methodology, compliance);
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Summary!A1',
        valueInputOption: 'RAW',
        requestBody: {
          values: summaryData
        }
      });

      // Make spreadsheet publicly viewable
      await this.drive.permissions.create({
        fileId: spreadsheetId,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });

      const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
      console.log(`✅ [GoogleSheets] Export complete: ${spreadsheetUrl}`);

      return {
        success: true,
        spreadsheetId,
        spreadsheetUrl,
        rowsWritten: rows.length
      };

    } catch (error) {
      console.error('❌ [GoogleSheets] Export failed:', error);
      throw error;
    }
  }

  createSummary(testCases, methodology, compliance) {
    const priorityCounts = {};
    const categoryCounts = {};

    testCases.forEach(tc => {
      const priority = tc.priority || 'Medium';
      const category = tc.category || 'Other';
      
      priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    return [
      ['MedTestAI Test Cases Summary'],
      [''],
      ['Generated At', new Date().toISOString()],
      ['Methodology', methodology],
      ['Compliance Framework', compliance],
      ['Total Test Cases', testCases.length],
      [''],
      ['Priority Breakdown'],
      ...Object.entries(priorityCounts).map(([priority, count]) => [priority, count]),
      [''],
      ['Category Breakdown'],
      ...Object.entries(categoryCounts).map(([category, count]) => [category, count])
    ];
  }
}

module.exports = new GoogleSheetsService();