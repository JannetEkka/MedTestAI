// services/google-sheets.js - COMPLETE ENHANCED VERSION with all features
import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

class GoogleSheetsService {
  constructor() {
    this.sheets = null;
    this.spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    
    console.log('📊 [GoogleSheets] Initializing...');
    console.log(`📊 [GoogleSheets] Spreadsheet ID: ${this.spreadsheetId ? '✅ Found' : '❌ Missing'}`);
    
    if (!this.spreadsheetId) {
      console.warn('⚠️  [GoogleSheets] GOOGLE_SHEETS_SPREADSHEET_ID not set - some features will create new sheets');
    }
  }

  async initialize() {
    try {
      console.log('📊 [GoogleSheets] Creating auth client...');
      
      const auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      this.sheets = google.sheets({ version: 'v4', auth });
      
      console.log('✅ [GoogleSheets] Google Sheets API initialized');
      console.log(`✅ [GoogleSheets] Target spreadsheet: ${this.spreadsheetId || 'will create new'}`);
    } catch (error) {
      console.error('❌ [GoogleSheets] Initialization failed:', error.message);
      throw error;
    }
  }

  // ==================== MAIN EXPORT FUNCTION ====================
  async exportTestCases(testCases, config = {}) {
    try {
      if (!this.spreadsheetId) {
        console.log('📊 [GoogleSheets] No spreadsheet configured, creating new one...');
        const newSheet = await this.createTestManagementSheet();
        this.spreadsheetId = newSheet.spreadsheetId;
      }

      console.log(`📊 [GoogleSheets] Exporting ${testCases.length} test cases...`);
      
      // Create or update test cases sheet
      await this.createTestCasesSheet(this.sheets, this.spreadsheetId, testCases, config);
      
      // Create summary dashboard
      await this.createSummarySheet(this.sheets, this.spreadsheetId, testCases, config);
      
      // Add charts
      await this.addCharts(this.sheets, this.spreadsheetId, testCases);
      
      // Apply color coding
      await this.applyColorCoding(this.sheets, this.spreadsheetId, testCases);

      console.log(`✅ [GoogleSheets] Export complete with enhanced formatting!`);

      return {
        success: true,
        updatedRows: testCases.length + 1, // +1 for header
        sheetUrl: `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}`,
        spreadsheetId: this.spreadsheetId
      };

    } catch (error) {
      console.error('❌ [GoogleSheets] Export error:', error.message);
      throw error;
    }
  }

  // ==================== CREATE TEST CASES SHEET ====================
  async createTestCasesSheet(sheets, spreadsheetId, data, config) {
    console.log('📊 [GoogleSheets] Creating formatted test cases sheet...');
    
    try {
      // Prepare headers
      const headers = [
        'Test ID', 'Test Name', 'Description', 'Priority', 'Risk Level',
        'Category', 'Methodology', 'Test Steps', 'Expected Results',
        'Preconditions', 'Test Data', 'Compliance Requirements', 
        'Environment', 'Status', 'Created Date'
      ];

      // Prepare data rows
      const rows = [headers];
      
      data.forEach(tc => {
        rows.push([
          tc.testId || '',
          tc.testName || '',
          tc.description || '',
          tc.priority || 'Medium',
          tc.riskLevel || 'Medium',
          tc.category || '',
          config.methodology || 'Agile',
          this.formatArray(tc.testSteps),
          this.formatArray(tc.expectedResults),
          this.formatArray(tc.preconditions),
          tc.testData || '',
          this.formatArray(tc.complianceRequirements || config.compliance),
          tc.environment || 'Test',
          tc.status || 'Not Run',
          new Date().toISOString().split('T')[0]
        ]);
      });

      // Check if "Test Cases" sheet exists
      const sheetsList = await sheets.spreadsheets.get({ spreadsheetId });
      const testCasesSheet = sheetsList.data.sheets?.find(s => s.properties.title === 'Test Cases');
      
      if (testCasesSheet) {
        // Clear existing data
        await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: 'Test Cases!A:Z'
        });
      } else {
        // Create new sheet
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: 'Test Cases',
                  gridProperties: {
                    frozenRowCount: 1,
                    frozenColumnCount: 2
                  }
                }
              }
            }]
          }
        });
      }

      // Write data
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Test Cases!A1',
        valueInputOption: 'RAW',
        requestBody: {
          values: rows
        }
      });

      // Get the sheet ID for formatting
      const updatedSheetsList = await sheets.spreadsheets.get({ spreadsheetId });
      const sheetId = updatedSheetsList.data.sheets?.find(s => s.properties.title === 'Test Cases')?.properties?.sheetId;

      // Apply formatting
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            // Format header row
            {
              repeatCell: {
                range: {
                  sheetId,
                  startRowIndex: 0,
                  endRowIndex: 1
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.2, green: 0.4, blue: 0.7 },
                    textFormat: {
                      bold: true,
                      foregroundColor: { red: 1, green: 1, blue: 1 },
                      fontSize: 11
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
                  sheetId,
                  dimension: 'COLUMNS',
                  startIndex: 0,
                  endIndex: headers.length
                }
              }
            },
            // Add alternating row colors
            {
              addConditionalFormatRule: {
                rule: {
                  ranges: [{
                    sheetId,
                    startRowIndex: 1,
                    endRowIndex: rows.length
                  }],
                  booleanRule: {
                    condition: {
                      type: 'CUSTOM_FORMULA',
                      values: [{ userEnteredValue: '=ISEVEN(ROW())' }]
                    },
                    format: {
                      backgroundColor: { red: 0.95, green: 0.95, blue: 0.95 }
                    }
                  }
                },
                index: 0
              }
            }
          ]
        }
      });

      console.log('✅ [GoogleSheets] Test cases sheet created with formatting');
    } catch (error) {
      console.error('❌ [GoogleSheets] Error creating test cases sheet:', error.message);
      throw error;
    }
  }

  // ==================== CREATE SUMMARY DASHBOARD ====================
  async createSummarySheet(sheets, spreadsheetId, testCases, metadata) {
    console.log('📊 [GoogleSheets] Creating summary dashboard...');
    
    try {
      // Calculate statistics
      const stats = this.calculateStatistics(testCases);
      
      // Prepare summary data
      const summaryData = [
        ['MedTestAI - Test Summary Dashboard'],
        [''],
        ['Generated:', new Date().toLocaleString()],
        ['Methodology:', metadata.methodology || 'Agile'],
        ['Compliance Framework:', this.formatArray(metadata.compliance) || 'HIPAA'],
        [''],
        ['📊 Test Case Statistics'],
        [''],
        ['Total Test Cases:', stats.total],
        ['High Priority:', stats.highPriority],
        ['Medium Priority:', stats.mediumPriority],
        ['Low Priority:', stats.lowPriority],
        [''],
        ['📋 Category Breakdown'],
        [''],
        ...Object.entries(stats.byCategory).map(([category, count]) => [category, count]),
        [''],
        ['🔒 Compliance Coverage'],
        [''],
        ...Object.entries(stats.byCompliance).map(([framework, count]) => [framework, count]),
        [''],
        ['⚠️ Risk Assessment'],
        [''],
        ['High Risk:', stats.highRisk],
        ['Medium Risk:', stats.mediumRisk],
        ['Low Risk:', stats.lowRisk],
        [''],
        ['📈 Test Coverage Metrics'],
        [''],
        ['Estimated Coverage:', `${stats.estimatedCoverage}%`],
        ['Total Requirements:', stats.totalRequirements || 'N/A'],
        ['Tests per Requirement:', stats.testsPerRequirement || 'N/A']
      ];

      // Check if "Summary" sheet exists
      const sheetsList = await sheets.spreadsheets.get({ spreadsheetId });
      const summarySheet = sheetsList.data.sheets?.find(s => s.properties.title === 'Summary');
      
      if (summarySheet) {
        await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: 'Summary!A:Z'
        });
      } else {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: 'Summary',
                  index: 0, // Make it first sheet
                  gridProperties: {
                    frozenRowCount: 1
                  }
                }
              }
            }]
          }
        });
      }

      // Write data
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Summary!A1',
        valueInputOption: 'RAW',
        requestBody: {
          values: summaryData
        }
      });

      // Get sheet ID for formatting
      const updatedSheetsList = await sheets.spreadsheets.get({ spreadsheetId });
      const sheetId = updatedSheetsList.data.sheets?.find(s => s.properties.title === 'Summary')?.properties?.sheetId;

      // Apply formatting
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            // Format title
            {
              repeatCell: {
                range: {
                  sheetId,
                  startRowIndex: 0,
                  endRowIndex: 1,
                  startColumnIndex: 0,
                  endColumnIndex: 1
                },
                cell: {
                  userEnteredFormat: {
                    textFormat: {
                      bold: true,
                      fontSize: 16,
                      foregroundColor: { red: 0.2, green: 0.4, blue: 0.7 }
                    }
                  }
                },
                fields: 'userEnteredFormat(textFormat)'
              }
            },
            // Format section headers
            {
              repeatCell: {
                range: {
                  sheetId,
                  startRowIndex: 6,
                  endRowIndex: 7
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                    textFormat: {
                      bold: true,
                      fontSize: 12
                    }
                  }
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat)'
              }
            },
            // Auto-resize
            {
              autoResizeDimensions: {
                dimensions: {
                  sheetId,
                  dimension: 'COLUMNS',
                  startIndex: 0,
                  endIndex: 2
                }
              }
            }
          ]
        }
      });

      console.log('✅ [GoogleSheets] Summary dashboard created');
    } catch (error) {
      console.error('❌ [GoogleSheets] Error creating summary:', error.message);
      throw error;
    }
  }

  // ==================== ADD CHARTS ====================
  async addCharts(sheets, spreadsheetId, testCases) {
    console.log('📊 [GoogleSheets] Adding visualization charts...');
    
    try {
      const sheetsList = await sheets.spreadsheets.get({ spreadsheetId });
      const testCasesSheetId = sheetsList.data.sheets?.find(s => s.properties.title === 'Test Cases')?.properties?.sheetId;
      
      if (!testCasesSheetId) {
        console.warn('⚠️  [GoogleSheets] Test Cases sheet not found, skipping charts');
        return;
      }

      // Create charts sheet if doesn't exist
      let chartsSheetId;
      const chartsSheet = sheetsList.data.sheets?.find(s => s.properties.title === 'Charts');
      
      if (!chartsSheet) {
        const response = await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: 'Charts',
                  index: 1
                }
              }
            }]
          }
        });
        chartsSheetId = response.data.replies[0].addSheet.properties.sheetId;
      } else {
        chartsSheetId = chartsSheet.properties.sheetId;
      }

      // Add priority distribution pie chart
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addChart: {
                chart: {
                  spec: {
                    title: 'Test Cases by Priority',
                    pieChart: {
                      domain: {
                        sourceRange: {
                          sources: [{
                            sheetId: testCasesSheetId,
                            startRowIndex: 1,
                            endRowIndex: testCases.length + 1,
                            startColumnIndex: 3,
                            endColumnIndex: 4
                          }]
                        }
                      },
                      series: {
                        sourceRange: {
                          sources: [{
                            sheetId: testCasesSheetId,
                            startRowIndex: 1,
                            endRowIndex: testCases.length + 1,
                            startColumnIndex: 0,
                            endColumnIndex: 1
                          }]
                        }
                      },
                      legendPosition: 'RIGHT_LEGEND'
                    }
                  },
                  position: {
                    overlayPosition: {
                      anchorCell: {
                        sheetId: chartsSheetId,
                        rowIndex: 0,
                        columnIndex: 0
                      }
                    }
                  }
                }
              }
            },
            {
              addChart: {
                chart: {
                  spec: {
                    title: 'Test Cases by Category',
                    basicChart: {
                      chartType: 'COLUMN',
                      axis: [{
                        position: 'BOTTOM_AXIS',
                        title: 'Category'
                      }, {
                        position: 'LEFT_AXIS',
                        title: 'Count'
                      }],
                      domains: [{
                        domain: {
                          sourceRange: {
                            sources: [{
                              sheetId: testCasesSheetId,
                              startRowIndex: 1,
                              endRowIndex: testCases.length + 1,
                              startColumnIndex: 5,
                              endColumnIndex: 6
                            }]
                          }
                        }
                      }],
                      series: [{
                        series: {
                          sourceRange: {
                            sources: [{
                              sheetId: testCasesSheetId,
                              startRowIndex: 1,
                              endRowIndex: testCases.length + 1,
                              startColumnIndex: 0,
                              endColumnIndex: 1
                            }]
                          }
                        },
                        targetAxis: 'LEFT_AXIS'
                      }],
                      legendPosition: 'NO_LEGEND'
                    }
                  },
                  position: {
                    overlayPosition: {
                      anchorCell: {
                        sheetId: chartsSheetId,
                        rowIndex: 0,
                        columnIndex: 6
                      }
                    }
                  }
                }
              }
            }
          ]
        }
      });

      console.log('✅ [GoogleSheets] Charts added successfully');
    } catch (error) {
      console.error('❌ [GoogleSheets] Error adding charts:', error.message);
      // Don't throw - charts are nice-to-have
    }
  }

  // ==================== APPLY COLOR CODING ====================
  async applyColorCoding(sheets, spreadsheetId, testCases) {
    console.log('📊 [GoogleSheets] Applying conditional color coding...');
    
    try {
      const sheetsList = await sheets.spreadsheets.get({ spreadsheetId });
      const sheetId = sheetsList.data.sheets?.find(s => s.properties.title === 'Test Cases')?.properties?.sheetId;
      
      if (!sheetId) {
        console.warn('⚠️  [GoogleSheets] Test Cases sheet not found, skipping color coding');
        return;
      }

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            // Priority column - High = Red
            {
              addConditionalFormatRule: {
                rule: {
                  ranges: [{
                    sheetId,
                    startRowIndex: 1,
                    endRowIndex: testCases.length + 1,
                    startColumnIndex: 3,
                    endColumnIndex: 4
                  }],
                  booleanRule: {
                    condition: {
                      type: 'TEXT_EQ',
                      values: [{ userEnteredValue: 'High' }]
                    },
                    format: {
                      backgroundColor: { red: 1, green: 0.8, blue: 0.8 },
                      textFormat: {
                        bold: true,
                        foregroundColor: { red: 0.8, green: 0, blue: 0 }
                      }
                    }
                  }
                },
                index: 0
              }
            },
            // Priority column - Medium = Yellow
            {
              addConditionalFormatRule: {
                rule: {
                  ranges: [{
                    sheetId,
                    startRowIndex: 1,
                    endRowIndex: testCases.length + 1,
                    startColumnIndex: 3,
                    endColumnIndex: 4
                  }],
                  booleanRule: {
                    condition: {
                      type: 'TEXT_EQ',
                      values: [{ userEnteredValue: 'Medium' }]
                    },
                    format: {
                      backgroundColor: { red: 1, green: 1, blue: 0.8 },
                      textFormat: {
                        foregroundColor: { red: 0.6, green: 0.6, blue: 0 }
                      }
                    }
                  }
                },
                index: 0
              }
            },
            // Priority column - Low = Green
            {
              addConditionalFormatRule: {
                rule: {
                  ranges: [{
                    sheetId,
                    startRowIndex: 1,
                    endRowIndex: testCases.length + 1,
                    startColumnIndex: 3,
                    endColumnIndex: 4
                  }],
                  booleanRule: {
                    condition: {
                      type: 'TEXT_EQ',
                      values: [{ userEnteredValue: 'Low' }]
                    },
                    format: {
                      backgroundColor: { red: 0.8, green: 1, blue: 0.8 },
                      textFormat: {
                        foregroundColor: { red: 0, green: 0.6, blue: 0 }
                      }
                    }
                  }
                },
                index: 0
              }
            }
          ]
        }
      });

      console.log('✅ [GoogleSheets] Color coding applied');
    } catch (error) {
      console.error('❌ [GoogleSheets] Error applying color coding:', error.message);
      // Don't throw - formatting is nice-to-have
    }
  }

  // ==================== UTILITY FUNCTIONS ====================
  formatArray(arr) {
    if (!arr) return '';
    if (typeof arr === 'string') return arr;
    if (Array.isArray(arr)) {
      if (arr.length === 0) return '';
      // Handle array of objects (like test steps)
      if (typeof arr[0] === 'object') {
        return arr.map((item, i) => `${i + 1}. ${item.action || item.description || JSON.stringify(item)}`).join('\n');
      }
      return arr.join('; ');
    }
    return String(arr);
  }

  calculateStatistics(testCases) {
    const stats = {
      total: testCases.length,
      highPriority: 0,
      mediumPriority: 0,
      lowPriority: 0,
      highRisk: 0,
      mediumRisk: 0,
      lowRisk: 0,
      byCategory: {},
      byCompliance: {},
      estimatedCoverage: 0,
      totalRequirements: 0,
      testsPerRequirement: 0
    };

    testCases.forEach(tc => {
      // Count priorities
      const priority = (tc.priority || 'Medium').toLowerCase();
      if (priority.includes('high')) stats.highPriority++;
      else if (priority.includes('low')) stats.lowPriority++;
      else stats.mediumPriority++;

      // Count risk levels
      const risk = (tc.riskLevel || 'Medium').toLowerCase();
      if (risk.includes('high')) stats.highRisk++;
      else if (risk.includes('low')) stats.lowRisk++;
      else stats.mediumRisk++;

      // Count by category
      const category = tc.category || 'Uncategorized';
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;

      // Count by compliance
      const compliance = tc.complianceRequirements || ['HIPAA'];
      (Array.isArray(compliance) ? compliance : [compliance]).forEach(framework => {
        stats.byCompliance[framework] = (stats.byCompliance[framework] || 0) + 1;
      });
    });

    // Estimate coverage (simplified - assumes decent coverage with this many tests)
    stats.estimatedCoverage = Math.min(95, Math.round((testCases.length / 10) * 100));

    return stats;
  }

  // ==================== BASIC FUNCTIONS (kept for compatibility) ====================
  async getTestCases() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Test Cases!A2:O' // Skip header row
      });

      const rows = response.data.values || [];
      return rows.map(row => ({
        testId: row[0],
        testName: row[1],
        description: row[2],
        priority: row[3],
        riskLevel: row[4],
        category: row[5],
        methodology: row[6],
        testSteps: row[7] ? row[7].split('\n') : [],
        expectedResults: row[8] ? row[8].split('\n') : [],
        preconditions: row[9] ? row[9].split('\n') : [],
        testData: row[10],
        complianceRequirements: row[11] ? row[11].split('; ') : [],
        environment: row[12],
        status: row[13],
        createdDate: row[14]
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
          sheets: [
            {
              properties: {
                title: 'Summary',
                index: 0
              }
            },
            {
              properties: {
                title: 'Test Cases',
                index: 1,
                gridProperties: {
                  frozenRowCount: 1,
                  frozenColumnCount: 2
                }
              }
            },
            {
              properties: {
                title: 'Charts',
                index: 2
              }
            }
          ]
        }
      });

      const newSpreadsheetId = response.data.spreadsheetId;
      console.log(`✅ [GoogleSheets] Created new spreadsheet: ${newSpreadsheetId}`);

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