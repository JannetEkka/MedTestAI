// services/googleSheetsEnhanced.js
import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Enhanced Google Sheets Service with Full Export Configuration
 * 
 * Supports:
 * - Custom folder locations
 * - Custom spreadsheet names
 * - Sharing with specified users
 * - Multiple organization types (new sheet, append, new tab)
 * - Auto-numbering and timestamps
 */

class GoogleSheetsEnhanced {
  constructor() {
    this.sheets = null;
    this.drive = null;
    this.auth = null;
  }

  async initialize() {
    try {
      console.log('📊 [GoogleSheetsEnhanced] Initializing...');
      
      this.auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/drive.file'
        ]
      });

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      this.drive = google.drive({ version: 'v3', auth: this.auth });
      
      console.log('✅ [GoogleSheetsEnhanced] Initialized successfully');
    } catch (error) {
      console.error('❌ [GoogleSheetsEnhanced] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create a new spreadsheet with configuration
   */
  async createSpreadsheet(config) {
    try {
      const { spreadsheetName, driveFolderId, tabName } = config;
      
      console.log(`📄 [GoogleSheetsEnhanced] Creating new spreadsheet: ${spreadsheetName}`);
      
      // Create spreadsheet
      const spreadsheet = await this.sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: spreadsheetName || 'MedTestAI Test Cases'
          },
          sheets: [{
            properties: {
              title: tabName || 'Test Cases',
              gridProperties: {
                frozenRowCount: 1
              }
            }
          }]
        }
      });

      const spreadsheetId = spreadsheet.data.spreadsheetId;
      console.log(`✅ [GoogleSheetsEnhanced] Spreadsheet created: ${spreadsheetId}`);

      // Move to folder if specified
      if (driveFolderId) {
        await this.moveToFolder(spreadsheetId, driveFolderId);
      }

      return {
        spreadsheetId,
        url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
      };

    } catch (error) {
      console.error('❌ [GoogleSheetsEnhanced] Failed to create spreadsheet:', error);
      throw error;
    }
  }

  /**
   * Move spreadsheet to a specific Drive folder
   */
  async moveToFolder(fileId, folderId) {
    try {
      console.log(`📁 [GoogleSheetsEnhanced] Moving file to folder: ${folderId}`);
      
      // Get current parents
      const file = await this.drive.files.get({
        fileId: fileId,
        fields: 'parents'
      });

      const previousParents = file.data.parents.join(',');

      // Move file
      await this.drive.files.update({
        fileId: fileId,
        addParents: folderId,
        removeParents: previousParents,
        fields: 'id, parents'
      });

      console.log('✅ [GoogleSheetsEnhanced] File moved successfully');
    } catch (error) {
      console.error('❌ [GoogleSheetsEnhanced] Failed to move file:', error);
      throw error;
    }
  }

  /**
   * Share spreadsheet with specified users
   */
  async shareSpreadsheet(spreadsheetId, shareWith, permission = 'reader') {
    try {
      if (!shareWith || shareWith.length === 0) {
        return;
      }

      console.log(`👥 [GoogleSheetsEnhanced] Sharing with ${shareWith.length} users...`);
      
      const permissionRole = permission === 'reader' ? 'reader' :
                            permission === 'commenter' ? 'commenter' : 'writer';

      for (const email of shareWith) {
        await this.drive.permissions.create({
          fileId: spreadsheetId,
          requestBody: {
            type: 'user',
            role: permissionRole,
            emailAddress: email
          },
          sendNotificationEmail: true
        });
        
        console.log(`✅ [GoogleSheetsEnhanced] Shared with: ${email}`);
      }

    } catch (error) {
      console.error('❌ [GoogleSheetsEnhanced] Failed to share spreadsheet:', error);
      throw error;
    }
  }

  /**
   * Add test cases to a new tab in existing spreadsheet
   */
  async addNewTab(spreadsheetId, tabName, testCases) {
    try {
      console.log(`📑 [GoogleSheetsEnhanced] Adding new tab: ${tabName}`);
      
      // Create new sheet
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: tabName,
                gridProperties: {
                  frozenRowCount: 1
                }
              }
            }
          }]
        }
      });

      // Add data to new tab
      await this.addTestCasesToSheet(spreadsheetId, `${tabName}!A1`, testCases);
      
      console.log('✅ [GoogleSheetsEnhanced] New tab created and populated');
    } catch (error) {
      console.error('❌ [GoogleSheetsEnhanced] Failed to add new tab:', error);
      throw error;
    }
  }

  /**
   * Append test cases to existing sheet
   */
  async appendToSheet(spreadsheetId, testCases, tabName = 'Test Cases') {
    try {
      console.log(`➕ [GoogleSheetsEnhanced] Appending to existing sheet...`);
      
      // Get current data to determine append range
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${tabName}!A:A`
      });

      const rows = response.data.values || [];
      const nextRow = rows.length + 1;

      // Prepare test case rows
      const testCaseRows = this.prepareTestCaseRows(testCases);

      // Append data
      await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${tabName}!A${nextRow}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: testCaseRows
        }
      });

      console.log(`✅ [GoogleSheetsEnhanced] Appended ${testCases.length} test cases`);
    } catch (error) {
      console.error('❌ [GoogleSheetsEnhanced] Failed to append to sheet:', error);
      throw error;
    }
  }

  /**
   * Add test cases to a sheet starting at specified range
   */
  async addTestCasesToSheet(spreadsheetId, range, testCases) {
    try {
      // Prepare header and data rows
      const headers = [
        'Test ID', 'Test Name', 'Category', 'Priority', 'Description',
        'Risk Level', 'Testing Technique', 'Automation Potential',
        'Preconditions', 'Test Steps', 'Expected Results',
        'Compliance Requirements', 'Created Date'
      ];

      const rows = [
        headers,
        ...this.prepareTestCaseRows(testCases)
      ];

      // Write to sheet
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        requestBody: {
          values: rows
        }
      });

      // Format header row
      await this.formatHeaderRow(spreadsheetId, range.split('!')[0]);

    } catch (error) {
      console.error('❌ [GoogleSheetsEnhanced] Failed to add test cases:', error);
      throw error;
    }
  }

  /**
   * Prepare test case data for spreadsheet
   */
  prepareTestCaseRows(testCases) {
    return testCases.map(tc => [
      tc.testId || '',
      tc.testName || '',
      tc.category || '',
      tc.priority || 'Medium',
      tc.description || '',
      tc.riskLevel || '',
      tc.testingTechnique || '',
      tc.automationPotential || '',
      Array.isArray(tc.preconditions) ? tc.preconditions.join('\n') : '',
      Array.isArray(tc.testSteps) ? 
        tc.testSteps.map((s, i) => `${i + 1}. ${s.action || s}`).join('\n') : '',
      Array.isArray(tc.expectedResults) ? tc.expectedResults.join('\n') : '',
      Array.isArray(tc.complianceRequirements) ? 
        tc.complianceRequirements.join('; ') : '',
      new Date().toISOString()
    ]);
  }

  /**
   * Format header row with bold text and background color
   */
  async formatHeaderRow(spreadsheetId, sheetName) {
    try {
      // Get sheet ID
      const spreadsheet = await this.sheets.spreadsheets.get({ spreadsheetId });
      const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
      const sheetId = sheet.properties.sheetId;

      // Format header
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: 0,
                endRowIndex: 1
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.2, green: 0.5, blue: 0.8 },
                  textFormat: {
                    bold: true,
                    foregroundColor: { red: 1, green: 1, blue: 1 }
                  }
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)'
            }
          }]
        }
      });

    } catch (error) {
      console.warn('⚠️ [GoogleSheetsEnhanced] Failed to format header:', error.message);
      // Non-critical error, continue
    }
  }

  /**
   * Export test cases with full configuration support
   */
  async exportWithConfig(testCases, config) {
    try {
      console.log('\n📊 [GoogleSheetsEnhanced] Starting configured export...');
      console.log(`📋 [GoogleSheetsEnhanced] Test cases: ${testCases.length}`);
      console.log(`⚙️ [GoogleSheetsEnhanced] Organization: ${config.organizationType}`);

      let spreadsheetId, spreadsheetUrl;

      switch (config.organizationType) {
        case 'new-sheet':
          // Create new spreadsheet
          const newSheet = await this.createSpreadsheet(config);
          spreadsheetId = newSheet.spreadsheetId;
          spreadsheetUrl = newSheet.url;
          
          // Add test cases
          await this.addTestCasesToSheet(
            spreadsheetId,
            `${config.tabName || 'Test Cases'}!A1`,
            testCases
          );
          break;

        case 'append-to-existing':
          // Append to existing spreadsheet
          spreadsheetId = config.existingSpreadsheetId;
          await this.appendToSheet(spreadsheetId, testCases, config.tabName);
          spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
          break;

        case 'new-tab':
          // Add new tab to existing spreadsheet
          spreadsheetId = config.existingSpreadsheetId;
          await this.addNewTab(spreadsheetId, config.tabName || 'New Test Cases', testCases);
          spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
          break;

        default:
          throw new Error(`Unknown organization type: ${config.organizationType}`);
      }

      // Share with specified users
      if (config.shareWith && config.shareWith.length > 0) {
        await this.shareSpreadsheet(
          spreadsheetId,
          config.shareWith,
          config.sharePermission
        );
      }

      console.log('✅ [GoogleSheetsEnhanced] Export completed successfully');
      console.log(`🔗 [GoogleSheetsEnhanced] URL: ${spreadsheetUrl}`);

      return {
        success: true,
        spreadsheetId,
        spreadsheetUrl,
        testCaseCount: testCases.length,
        sharedWith: config.shareWith || []
      };

    } catch (error) {
      console.error('❌ [GoogleSheetsEnhanced] Export failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
const googleSheetsEnhanced = new GoogleSheetsEnhanced();
export default googleSheetsEnhanced;