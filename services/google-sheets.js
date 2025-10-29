// services/google-sheets.js - FIXED VERSION
import { google } from 'googleapis';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class GoogleSheetsService {
  constructor() {
    this.sheets = null;
    this.spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    
    // Debug logging
    console.log('📊 [GoogleSheets] Initializing...');
    console.log(`📊 [GoogleSheets] Spreadsheet ID: ${this.spreadsheetId ? '✅ Found' : '❌ Missing'}`);
    
    if (!this.spreadsheetId) {
      console.error('❌ [GoogleSheets] GOOGLE_SHEETS_SPREADSHEET_ID not set in .env!');
      console.error('❌ [GoogleSheets] Add this to your .env file:');
      console.error('   GOOGLE_SHEETS_SPREADSHEET_ID=1FdqooOq4mP9a8D_vnc3hkwwhau0KkuzbwdL6lsyf2Y0');
    }
  }

  async initialize() {
    try {
      console.log('📊 [GoogleSheets] Step 1: Creating auth client...');
      
      const auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      console.log('📊 [GoogleSheets] Step 2: Initializing Sheets API...');
      this.sheets = google.sheets({ version: 'v4', auth });
      
      console.log('✅ [GoogleSheets] Google Sheets API initialized');
      console.log(`✅ [GoogleSheets] Target spreadsheet: ${this.spreadsheetId}`);
    } catch (error) {
      console.error('❌ [GoogleSheets] Initialization failed:', error.message);
      throw error;
    }
  }

  async exportTestCases(testCases) {
    try {
      if (!this.spreadsheetId) {
        throw new Error('Spreadsheet ID not configured. Check GOOGLE_SHEETS_SPREADSHEET_ID in .env');
      }

      console.log(`📊 [GoogleSheets] Exporting ${testCases.length} test cases...`);
      
      // Prepare rows for sheet
      const rows = [
        // Header row
        ['Test ID', 'Test Name', 'Description', 'Priority', 'Category', 
         'Test Steps', 'Expected Results', 'Compliance', 'Created Date']
      ];

      // Data rows
      testCases.forEach(tc => {
        rows.push([
          tc.testId || '',
          tc.testName || '',
          tc.description || '',
          tc.priority || 'Medium',
          tc.category || '',
          Array.isArray(tc.testSteps) ? tc.testSteps.join('\n') : '',
          Array.isArray(tc.expectedResults) ? tc.expectedResults.join('\n') : '',
          Array.isArray(tc.complianceRequirements) ? tc.complianceRequirements.join('; ') : '',
          new Date().toISOString()
        ]);
      });

      console.log(`📊 [GoogleSheets] Appending ${rows.length} rows to sheet...`);

      // Append to sheet
      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'Sheet1!A:I',  // Changed from 'Test Cases!A:I'
        valueInputOption: 'RAW',
        requestBody: {
          values: rows
        }
      });

      console.log(`✅ [GoogleSheets] Export complete!`);

      return {
        success: true,
        updatedRows: response.data.updates.updatedRows,
        sheetUrl: `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}`
      };

    } catch (error) {
      console.error('❌ [GoogleSheets] Export error:', error.message);
      console.error('❌ [GoogleSheets] Full error:', error);
      throw error;
    }
  }

  async getTestCases() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Sheet1!A2:I' // Skip header row
      });

      const rows = response.data.values || [];
      return rows.map(row => ({
        testId: row[0],
        testName: row[1],
        description: row[2],
        priority: row[3],
        category: row[4],
        testSteps: row[5] ? row[5].split('\n') : [],
        expectedResults: row[6] ? row[6].split('\n') : [],
        complianceRequirements: row[7] ? row[7].split('; ') : [],
        createdDate: row[8]
      }));

    } catch (error) {
      console.error('❌ [GoogleSheets] Read error:', error);
      throw error;
    }
  }

  async createTestManagementSheet() {
    try {
      const response = await this.sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: `MedTestAI Test Cases - ${new Date().toISOString().split('T')[0]}`
          },
          sheets: [{
            properties: {
              title: 'Sheet1',
              gridProperties: {
                frozenRowCount: 1
              }
            }
          }]
        }
      });

      const newSpreadsheetId = response.data.spreadsheetId;

      // Format header row
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: newSpreadsheetId,
        requestBody: {
          requests: [{
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.2, green: 0.6, blue: 0.9 },
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

      // Add header row
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: newSpreadsheetId,
        range: 'Sheet1!A1:I1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            'Test ID', 'Test Name', 'Description', 'Priority', 'Category',
            'Test Steps', 'Expected Results', 'Compliance', 'Created Date'
          ]]
        }
      });

      return {
        spreadsheetId: newSpreadsheetId,
        url: `https://docs.google.com/spreadsheets/d/${newSpreadsheetId}`
      };

    } catch (error) {
      console.error('❌ [GoogleSheets] Sheet creation error:', error);
      throw error;
    }
  }
}

export default new GoogleSheetsService();