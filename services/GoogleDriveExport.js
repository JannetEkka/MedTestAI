// services/GoogleDriveExport.js - Simple Drive Folder Export
import { google } from 'googleapis';
import fs from 'fs/promises';

class GoogleDriveExport {
  constructor() {
    this.drive = null;
    this.sheets = null;
    this.auth = null;
  }

  async initialize() {
    try {
      console.log('📁 [DriveExport] Initializing...');
      
      // Load service account credentials
      const credentials = JSON.parse(
        await fs.readFile(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8')
      );

      this.auth = new google.auth.JWT(
        credentials.client_email,
        null,
        credentials.private_key,
        [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive.file'
        ]
      );

      this.drive = google.drive({ version: 'v3', auth: this.auth });
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      
      console.log('✅ [DriveExport] Initialized');
      return true;
    } catch (error) {
      console.error('❌ [DriveExport] Init failed:', error);
      throw error;
    }
  }

  /**
   * Create Google Sheet in user's folder
   */
  async createSheetInFolder(testCases, config) {
    try {
      if (!this.sheets || !this.drive) {
        await this.initialize();
      }

      const {
        folderId,
        fileName = 'MedTestAI Test Cases',
        methodology = 'agile',
        compliance = 'HIPAA'
      } = config;

      console.log(`📁 [DriveExport] Creating sheet in folder: ${folderId}`);
      
      // Step 1: Create spreadsheet
      const timestamp = new Date().toISOString().split('T')[0];
      const fullName = `${fileName} - ${timestamp}`;
      
      const spreadsheet = await this.sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: fullName
          },
          sheets: [{
            properties: {
              title: 'Test Cases',
              gridProperties: {
                frozenRowCount: 1
              }
            }
          }]
        }
      });

      const spreadsheetId = spreadsheet.data.spreadsheetId;
      console.log(`✅ [DriveExport] Created sheet: ${spreadsheetId}`);

      // Step 2: Move to user's folder
      if (folderId) {
        await this.drive.files.update({
          fileId: spreadsheetId,
          addParents: folderId,
          fields: 'id, parents'
        });
        console.log(`✅ [DriveExport] Moved to folder: ${folderId}`);
      }

      // Step 3: Add test cases data
      await this.writeTestCases(spreadsheetId, testCases, { methodology, compliance });

      // Step 4: Format the sheet
      await this.formatSheet(spreadsheetId);

      const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
      
      console.log(`✅ [DriveExport] Export complete: ${sheetUrl}`);

      return {
        success: true,
        spreadsheetId,
        spreadsheetUrl: sheetUrl,
        fileName: fullName
      };

    } catch (error) {
      console.error('❌ [DriveExport] Export failed:', error);
      throw error;
    }
  }

  /**
   * Write test cases to sheet
   */
  async writeTestCases(spreadsheetId, testCases, metadata) {
    const headers = [
      'Test ID',
      'Test Name',
      'Category',
      'Priority',
      'Description',
      'Test Steps',
      'Expected Result',
      'Compliance',
      'Status'
    ];

    const rows = testCases.map((tc, index) => [
      tc.testId || tc.id || `TC-${index + 1}`,
      tc.testName || tc.name || tc.title || '',
      tc.category || '',
      tc.priority || 'Medium',
      tc.description || '',
      this.formatSteps(tc.testSteps || tc.steps),
      tc.expectedResults || tc.expected || '',
      Array.isArray(tc.complianceRequirements) 
        ? tc.complianceRequirements.join(', ')
        : tc.complianceRequirements || metadata.compliance,
      'Not Run'
    ]);

    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Test Cases!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers, ...rows]
      }
    });

    console.log(`✅ [DriveExport] Wrote ${testCases.length} test cases`);
  }

  /**
   * Format steps array
   */
  formatSteps(steps) {
    if (!steps) return '';
    if (typeof steps === 'string') return steps;
    if (Array.isArray(steps)) {
      return steps.map((step, i) => {
        if (typeof step === 'object') {
          return `${i + 1}. ${step.action || step.step || step}`;
        }
        return `${i + 1}. ${step}`;
      }).join('\n');
    }
    return String(steps);
  }

  /**
   * Format the sheet with styling
   */
  async formatSheet(spreadsheetId) {
    try {
      const requests = [
        // Header formatting
        {
          repeatCell: {
            range: {
              sheetId: 0,
              startRowIndex: 0,
              endRowIndex: 1
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.4, green: 0.5, blue: 0.9 },
                textFormat: {
                  foregroundColor: { red: 1, green: 1, blue: 1 },
                  fontSize: 11,
                  bold: true
                },
                horizontalAlignment: 'CENTER'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
          }
        },
        // Auto-resize columns
        {
          autoResizeDimensions: {
            dimensions: {
              sheetId: 0,
              dimension: 'COLUMNS',
              startIndex: 0,
              endIndex: 9
            }
          }
        }
      ];

      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests }
      });

      console.log('✅ [DriveExport] Applied formatting');
    } catch (error) {
      console.warn('⚠️  [DriveExport] Formatting failed:', error.message);
    }
  }

  /**
   * Verify folder access
   */
  async verifyFolder(folderId) {
    try {
      const folder = await this.drive.files.get({
        fileId: folderId,
        fields: 'id, name, mimeType'
      });

      if (folder.data.mimeType !== 'application/vnd.google-apps.folder') {
        throw new Error('Not a folder');
      }

      return {
        valid: true,
        folderName: folder.data.name
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }
}

export default new GoogleDriveExport();