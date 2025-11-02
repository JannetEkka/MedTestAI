# FINAL-FIX-NOW.ps1
# FIXES: UI tabs not showing + Google Drive export

Write-Host "================================================" -ForegroundColor Red
Write-Host "FINAL FIX - UI + GOOGLE DRIVE" -ForegroundColor Red  
Write-Host "================================================" -ForegroundColor Red

$projectRoot = "D:\Projects\Gen AI Exchange Hackathon\MedTestAI"
Set-Location $projectRoot

Write-Host "`n[ISSUE 1] TestResults.js missing Overview/Tests tab content" -ForegroundColor Yellow
Write-Host "[ISSUE 2] Backend needs Cloud Run credentials" -ForegroundColor Yellow

# ============================================
# FIX 1: TestResults.js - ADD MISSING TAB CONTENT
# ============================================
Write-Host "`n[FIX 1] Creating complete TestResults.js..." -ForegroundColor Yellow

$testResultsComplete = @'
// frontend/src/components/TestResults.js - COMPLETE WITH ALL TABS
import React, { useState } from 'react';
import './TestResults.css';

const TestResults = ({ results, methodology, complianceFramework, onNewAnalysis }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [exportFormat, setExportFormat] = useState('csv');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [exportSuccess, setExportSuccess] = useState(null);

  const testCases = results?.testCases || [];
  const requirements = results?.extractedData?.requirements || [];
  const summary = results?.summary || {};
  const metadata = results?.metadata || {};

  console.log('TestResults loaded:', { testCases: testCases.length, requirements: requirements.length });

  const filteredTests = selectedCategory === 'all' 
    ? testCases 
    : testCases.filter(test => test.category === selectedCategory);

  const categories = ['all', ...new Set(testCases.map(test => test.category))];

  const getPriorityColor = (priority) => {
    const colors = { high: '#f44336', medium: '#ff9800', low: '#4caf50', critical: '#d32f2f' };
    return colors[priority?.toLowerCase()] || colors.medium;
  };

  const handleExport = async (format) => {
    setExportLoading(true);
    setExportError(null);
    setExportSuccess(null);

    try {
      if (!filteredTests || filteredTests.length === 0) {
        throw new Error('No test cases available');
      }

      console.log(`Exporting ${filteredTests.length} test cases as ${format}`);
      const API_URL = 'https://medtestai-backend-1067292712875.us-central1.run.app';

      if (format === 'google-sheets') {
        const folderId = prompt(
          'Enter your Google Drive Folder ID:\n\n' +
          'How to get it:\n' +
          '1. Open Google Drive\n' +
          '2. Open your folder\n' +
          '3. Copy ID from URL: drive.google.com/drive/folders/YOUR_FOLDER_ID\n\n' +
          'Folder ID:'
        );

        if (!folderId || !folderId.trim()) throw new Error('Folder ID required');

        console.log('Verifying folder access...');
        
        const verifyResp = await fetch(`${API_URL}/api/drive/verify-folder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderId: folderId.trim() })
        });

        if (!verifyResp.ok) throw new Error('Folder verification failed');

        const verifyResult = await verifyResp.json();
        if (!verifyResult.success) {
          throw new Error(verifyResult.error || 'Cannot access folder');
        }

        console.log(`Folder verified: ${verifyResult.folderName}`);

        const exportResp = await fetch(`${API_URL}/api/export/drive-folder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            testCases: filteredTests,
            folderId: folderId.trim(),
            fileName: 'MedTestAI Test Cases',
            methodology: methodology,
            compliance: complianceFramework
          })
        });

        if (!exportResp.ok) {
          const errorData = await exportResp.json().catch(() => ({ error: 'Export failed' }));
          throw new Error(errorData.error || 'Export failed');
        }

        const result = await exportResp.json();
        if (result.success) {
          setExportSuccess(`Created "${result.fileName}"!`);
          if (result.spreadsheetUrl) {
            setTimeout(() => window.open(result.spreadsheetUrl, '_blank'), 500);
          }
        }
      } else {
        const response = await fetch(`${API_URL}/api/tests/export`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            testCases: filteredTests,
            format: format.toLowerCase(),
            methodology: metadata.methodology || methodology || 'agile',
            compliance: metadata.complianceFramework || complianceFramework || 'HIPAA'
          })
        });

        if (!response.ok) throw new Error('Export failed');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `medtestai-testcases-${format}-${Date.now()}.${format === 'json' ? 'json' : 'csv'}`;
        a.click();
        window.URL.revokeObjectURL(url);
        setExportSuccess(`Downloaded ${filteredTests.length} test cases`);
      }
    } catch (error) {
      console.error('Export error:', error);
      setExportError(error.message);
    } finally {
      setExportLoading(false);
    }
  };

  const styles = {
    container: { maxWidth: '1200px', margin: '0 auto', padding: '20px', background: 'white', borderRadius: '12px' },
    tabs: { display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid #e0e0e0', padding: '0' },
    tab: { 
      padding: '12px 24px', 
      border: 'none', 
      background: 'none', 
      cursor: 'pointer', 
      fontSize: '16px', 
      fontWeight: '500',
      borderBottom: '3px solid transparent',
      transition: 'all 0.3s ease',
      color: '#666'
    },
    activeTab: { 
      borderBottom: '3px solid #667eea', 
      color: '#667eea',
      fontWeight: '600'
    },
    card: {
      background: 'white',
      padding: '20px',
      borderRadius: '8px',
      border: '1px solid #e0e0e0',
      marginBottom: '16px'
    },
    button: { 
      padding: '12px 24px', 
      border: 'none', 
      borderRadius: '8px', 
      cursor: 'pointer', 
      fontSize: '14px', 
      fontWeight: '600',
      transition: 'all 0.3s ease'
    },
    primaryButton: { background: '#667eea', color: 'white' },
    secondaryButton: { background: '#e0e7ff', color: '#667eea', border: '2px solid #667eea' },
    sheetsButton: { background: '#34A853', color: 'white' },
    priorityBadge: (priority) => ({
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '600',
      background: getPriorityColor(priority),
      color: 'white'
    })
  };

  return (
    <div style={styles.container}>
      <h2 style={{ color: '#667eea', marginBottom: '24px' }}>Test Generation Results</h2>

      <div style={styles.tabs}>
        <button
          style={{ ...styles.tab, ...(activeTab === 'overview' && styles.activeTab) }}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === 'tests' && styles.activeTab) }}
          onClick={() => setActiveTab('tests')}
        >
          Test Cases ({testCases.length})
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === 'export' && styles.activeTab) }}
          onClick={() => setActiveTab('export')}
        >
          Export
        </button>
      </div>

      {activeTab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '24px' }}>
            <div style={{ background: '#f0f4ff', padding: '24px', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#667eea' }}>{requirements.length}</div>
              <div style={{ color: '#666', marginTop: '8px', fontSize: '14px' }}>Requirements Found</div>
            </div>
            <div style={{ background: '#f0f4ff', padding: '24px', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#667eea' }}>{testCases.length}</div>
              <div style={{ color: '#666', marginTop: '8px', fontSize: '14px' }}>Test Cases Generated</div>
            </div>
            <div style={{ background: '#f0f4ff', padding: '24px', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#667eea' }}>
                {Array.isArray(metadata.complianceFrameworks) ? metadata.complianceFrameworks.length : 1}
              </div>
              <div style={{ color: '#666', marginTop: '8px', fontSize: '14px' }}>Compliance Frameworks</div>
            </div>
          </div>

          <div style={styles.card}>
            <h3 style={{ marginBottom: '16px', color: '#333' }}>Summary</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div><strong>Methodology:</strong> {metadata.methodology || methodology || 'N/A'}</div>
              <div><strong>Compliance:</strong> {metadata.complianceFramework || complianceFramework || 'N/A'}</div>
              <div><strong>Generated:</strong> {new Date(metadata.generatedAt || Date.now()).toLocaleString()}</div>
              {summary.totalTests && <div><strong>Total Tests:</strong> {summary.totalTests}</div>}
            </div>
          </div>

          {summary.byPriority && (
            <div style={styles.card}>
              <h3 style={{ marginBottom: '16px', color: '#333' }}>Test Cases by Priority</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                {Object.entries(summary.byPriority).map(([priority, count]) => (
                  <div key={priority} style={{ textAlign: 'center', padding: '12px', background: '#f8f9fa', borderRadius: '8px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: getPriorityColor(priority) }}>{count}</div>
                    <div style={{ fontSize: '12px', color: '#666', textTransform: 'capitalize', marginTop: '4px' }}>{priority}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'tests' && (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ marginRight: '12px', fontWeight: '600', color: '#333' }}>Filter by Category:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #e0e0e0', fontSize: '14px' }}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
            <span style={{ marginLeft: '12px', color: '#666' }}>
              Showing {filteredTests.length} test case{filteredTests.length !== 1 ? 's' : ''}
            </span>
          </div>

          {filteredTests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666', background: '#f8f9fa', borderRadius: '8px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>No test cases</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {filteredTests.map((test, idx) => (
                <div key={idx} style={styles.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', color: '#667eea', fontWeight: '600', marginBottom: '4px' }}>
                        {test.testId || `TC${String(idx + 1).padStart(3, '0')}`}
                      </div>
                      <h4 style={{ margin: '0 0 8px 0', color: '#333', fontSize: '16px' }}>
                        {test.testName || test.name || test.title || 'Untitled Test'}
                      </h4>
                    </div>
                    <span style={styles.priorityBadge(test.priority)}>
                      {test.priority || 'Medium'}
                    </span>
                  </div>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
                    <strong>Category:</strong> {test.category || 'N/A'}
                  </div>
                  <div style={{ fontSize: '14px', color: '#444', lineHeight: '1.6' }}>
                    {test.description || 'No description available'}
                  </div>
                  {test.testSteps && test.testSteps.length > 0 && (
                    <div style={{ marginTop: '12px', padding: '12px', background: '#f8f9fa', borderRadius: '6px' }}>
                      <strong style={{ fontSize: '13px', color: '#333' }}>Test Steps:</strong>
                      <ol style={{ margin: '8px 0 0 20px', padding: 0, fontSize: '13px', color: '#555' }}>
                        {test.testSteps.map((step, i) => (
                          <li key={i} style={{ marginBottom: '4px' }}>
                            {typeof step === 'object' ? step.step || step.action : step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'export' && (
        <div>
          <h3 style={{ marginBottom: '24px', color: '#333' }}>Export Test Cases</h3>
          
          {exportError && (
            <div style={{ padding: '16px', background: '#fee', color: '#c00', borderRadius: '8px', marginBottom: '16px' }}>
              {exportError}
            </div>
          )}

          {exportSuccess && (
            <div style={{ padding: '16px', background: '#efe', color: '#060', borderRadius: '8px', marginBottom: '16px' }}>
              {exportSuccess}
            </div>
          )}

          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ marginBottom: '16px', color: '#333' }}>Select Format:</h4>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                style={{ ...styles.button, ...(exportFormat === 'csv' ? styles.primaryButton : styles.secondaryButton) }}
                onClick={() => setExportFormat('csv')}
                disabled={exportLoading}
              >
                CSV
              </button>
              <button
                style={{ ...styles.button, ...(exportFormat === 'json' ? styles.primaryButton : styles.secondaryButton) }}
                onClick={() => setExportFormat('json')}
                disabled={exportLoading}
              >
                JSON
              </button>
              <button
                style={{ ...styles.button, ...(exportFormat === 'google-sheets' ? styles.sheetsButton : styles.secondaryButton) }}
                onClick={() => setExportFormat('google-sheets')}
                disabled={exportLoading}
              >
                GOOGLE SHEETS
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '24px', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#333' }}>Export Details</h4>
            <div style={{ fontSize: '14px', color: '#666', lineHeight: '1.8' }}>
              <div>Test Cases: <strong>{filteredTests.length}</strong></div>
              <div>Methodology: <strong>{methodology}</strong></div>
              <div>Compliance: <strong>{complianceFramework}</strong></div>
              {exportFormat === 'google-sheets' && (
                <div style={{ marginTop: '12px', padding: '12px', background: '#e8f5e9', borderRadius: '6px', color: '#2e7d32' }}>
                  You will be prompted for your Google Drive folder ID
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => handleExport(exportFormat)}
            disabled={exportLoading || filteredTests.length === 0}
            style={{
              ...styles.button,
              ...(exportFormat === 'google-sheets' ? styles.sheetsButton : styles.primaryButton),
              width: '100%',
              fontSize: '16px',
              padding: '16px',
              opacity: exportLoading || filteredTests.length === 0 ? 0.5 : 1,
              cursor: exportLoading || filteredTests.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            {exportLoading ? 'Exporting...' : 
             exportFormat === 'google-sheets' ? `Export ${filteredTests.length} Test Cases to Google Drive` :
             `Export ${filteredTests.length} Test Cases as ${exportFormat.toUpperCase()}`}
          </button>

          {filteredTests.length === 0 && (
            <p style={{ marginTop: '16px', color: '#999', textAlign: 'center', fontSize: '14px' }}>
              No test cases available to export
            </p>
          )}
        </div>
      )}

      <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e0e0e0', textAlign: 'center' }}>
        <button
          onClick={onNewAnalysis}
          style={{ ...styles.button, ...styles.secondaryButton, padding: '12px 32px' }}
        >
          Start New Analysis
        </button>
      </div>
    </div>
  );
};

export default TestResults;
'@

Copy-Item "frontend\src\components\TestResults.js" "frontend\src\components\TestResults.js.backup-final" -Force -ErrorAction SilentlyContinue
$testResultsComplete | Set-Content "frontend\src\components\TestResults.js" -Encoding UTF8
Write-Host "  OK Fixed TestResults.js" -ForegroundColor Green

# ============================================
# FIX 2: GoogleDriveExport.js
# ============================================
Write-Host "`n[FIX 2] Creating GoogleDriveExport.js..." -ForegroundColor Yellow

$googleDriveExportCloudRun = @'
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
'@

if (-not (Test-Path "services")) {
    New-Item -ItemType Directory -Path "services" -Force | Out-Null
}
$googleDriveExportCloudRun | Set-Content "services\GoogleDriveExport.js" -Encoding UTF8
Write-Host "  OK Created GoogleDriveExport.js" -ForegroundColor Green

# ============================================
# FIX 3: Update server.js
# ============================================
Write-Host "`n[FIX 3] Checking server.js..." -ForegroundColor Yellow

$serverFile = "server.js"
$content = Get-Content $serverFile -Raw

$needsUpdate = $false

if ($content -notmatch 'GoogleDriveExport') {
    $content = $content -replace '(import GoogleDriveService.*)', "`$1`nimport GoogleDriveExport from './services/GoogleDriveExport.js';"
    $needsUpdate = $true
    Write-Host "  OK Added import" -ForegroundColor Green
}

if ($content -notmatch '/api/drive/verify-folder') {
    $endpoints = @'


app.post('/api/drive/verify-folder', asyncHandler(async (req, res) => {
  const { folderId } = req.body;
  if (!folderId) return res.status(400).json({ success: false, error: 'Folder ID required' });
  const result = await GoogleDriveExport.verifyFolder(folderId);
  res.json({ success: result.valid, folderName: result.folderName, error: result.error });
}));

app.post('/api/export/drive-folder', asyncHandler(async (req, res) => {
  const { testCases, folderId, fileName, methodology, compliance } = req.body;
  if (!testCases || testCases.length === 0) return res.status(400).json({ success: false, error: 'No test cases' });
  if (!folderId) return res.status(400).json({ success: false, error: 'Folder ID required' });
  try {
    const result = await GoogleDriveExport.createSheetInFolder(testCases, { folderId, fileName: fileName || 'MedTestAI Test Cases', methodology, compliance });
    res.json({ success: true, spreadsheetUrl: result.spreadsheetUrl, spreadsheetId: result.spreadsheetId, fileName: result.fileName });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}));
'@

    $insertMarker = '// ==================== EXPORT ENDPOINTS ===================='
    if ($content -match $insertMarker) {
        $content = $content -replace $insertMarker, "$endpoints`n`n$insertMarker"
    } else {
        $content += "`n$endpoints"
    }
    $needsUpdate = $true
    Write-Host "  OK Added endpoints" -ForegroundColor Green
}

if ($needsUpdate) {
    $content | Set-Content $serverFile -Encoding UTF8
}

# ============================================
# FIX 4: Deploy Backend
# ============================================
Write-Host "`n[FIX 4] Deploying backend..." -ForegroundColor Yellow

gcloud run deploy medtestai-backend --source . --region=us-central1 --platform=managed --allow-unauthenticated --project=pro-variety-472211-b9

# ============================================
# FIX 5: Rebuild Frontend
# ============================================
Write-Host "`n[FIX 5] Rebuilding frontend..." -ForegroundColor Yellow

Set-Location "frontend"
npm run build

Write-Host "`n[FIX 6] Deploying to Firebase..." -ForegroundColor Yellow
firebase deploy --only hosting

Set-Location $projectRoot

Write-Host "`n================================================" -ForegroundColor Green
Write-Host "COMPLETE!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green

Write-Host "`nRefresh: https://pro-variety-472211-b9.web.app" -ForegroundColor Cyan
Write-Host "Your folder ID: 1mrYi-oRAEfKvEXopOexrG5GfTNsem5lm" -ForegroundColor Cyan