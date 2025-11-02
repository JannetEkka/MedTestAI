// services/GoogleDriveExport.js
import { google } from 'googleapis';

class GoogleDriveExport {
  constructor() {
    this.drive = null;
    this.sheets = null;
    this.auth = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return true;
    
    try {
      console.log('[DriveExport] Initializing...');
      
      this.auth = new google.auth.GoogleAuth({
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/drive'
        ]
      });

      const authClient = await this.auth.getClient();
      this.drive = google.drive({ version: 'v3', auth: authClient });
      this.sheets = google.sheets({ version: 'v4', auth: authClient });
      this.initialized = true;
      
      console.log('[DriveExport] Initialized');
      return true;
    } catch (error) {
      console.error('[DriveExport] Init failed:', error.message);
      throw new Error(`Drive Export Init Failed: ${error.message}`);
    }
  }

  async verifyFolder(folderId) {
    try {
      await this.initialize();
      
      console.log('[DriveExport] Verifying folder:', folderId);
      
      const response = await this.drive.files.get({
        fileId: folderId,
        fields: 'id, name, mimeType',
        supportsAllDrives: true
      });

      if (response.data.mimeType !== 'application/vnd.google-apps.folder') {
        return { valid: false, error: 'Not a folder' };
      }

      console.log('[DriveExport] Folder verified:', response.data.name);
      return { valid: true, folderName: response.data.name };
    } catch (error) {
      console.error('[DriveExport] Verify failed:', error.message);
      return { valid: false, error: error.message };
    }
  }

  async createSheetInFolder(testCases, config) {
    try {
      await this.initialize();

      const { folderId, fileName = 'MedTestAI Test Cases', methodology = 'agile', compliance = 'HIPAA' } = config;

      console.log(`[DriveExport] Creating sheet for ${testCases.length} test cases`);

      const timestamp = new Date().toISOString().split('T')[0];
      const fullName = `${fileName} - ${timestamp}`;
      
      const spreadsheet = await this.sheets.spreadsheets.create({
        requestBody: {
          properties: { title: fullName },
          sheets: [{ properties: { title: 'Test Cases', gridProperties: { frozenRowCount: 1 } } }]
        }
      });

      const spreadsheetId = spreadsheet.data.spreadsheetId;
      console.log('[DriveExport] Created:', spreadsheetId);

      await this.drive.files.update({
        fileId: spreadsheetId,
        addParents: folderId,
        fields: 'id, parents',
        supportsAllDrives: true
      });
      console.log('[DriveExport] Moved to folder');

      const headers = ['Test ID', 'Test Name', 'Category', 'Priority', 'Description', 'Preconditions', 'Test Steps', 'Expected Results', 'Compliance'];
      
      const rows = testCases.map(tc => [
        tc.testId || tc.id || '',
        tc.testName || tc.name || tc.title || '',
        tc.category || '',
        tc.priority || 'Medium',
        tc.description || '',
        this.formatArray(tc.preconditions),
        this.formatArray(tc.testSteps),
        tc.expectedResults || tc.expected || '',
        this.formatArray(tc.complianceRequirements)
      ]);

      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Test Cases!A1',
        valueInputOption: 'RAW',
        requestBody: { values: [headers, ...rows] }
      });

      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            repeatCell: {
              range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.4, green: 0.5, blue: 0.9 },
                  textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true },
                  horizontalAlignment: 'CENTER'
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
            }
          }, {
            autoResizeDimensions: {
              dimensions: { sheetId: 0, dimension: 'COLUMNS', startIndex: 0, endIndex: 9 }
            }
          }]
        }
      });

      const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
      console.log('[DriveExport] Complete:', url);

      return { spreadsheetId, spreadsheetUrl: url, fileName: fullName };
    } catch (error) {
      console.error('[DriveExport] Create failed:', error.message);
      throw error;
    }
  }

  formatArray(arr) {
    if (!arr) return '';
    if (typeof arr === 'string') return arr;
    if (Array.isArray(arr)) {
      return arr.map((item, i) => {
        if (typeof item === 'object') {
          return `${i+1}. ${item.step || item.action || JSON.stringify(item)}`;
        }
        return `${i+1}. ${item}`;
      }).join('\n');
    }
    return String(arr);
  }
}

export default new GoogleDriveExport();
