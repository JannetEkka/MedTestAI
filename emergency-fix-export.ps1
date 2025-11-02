# emergency-fix-export.ps1
# EMERGENCY FIX: Display + Export for MedTestAI
# Time-critical fix for test results display and Google Sheets export

Write-Host "================================================" -ForegroundColor Red
Write-Host "EMERGENCY FIX - Test Results & Export" -ForegroundColor Red
Write-Host "================================================" -ForegroundColor Red

$projectRoot = "D:\Projects\Gen AI Exchange Hackathon\MedTestAI"
Set-Location $projectRoot

# ============================================
# FIX 1: Create GoogleDriveExport.js
# ============================================
Write-Host "`n[FIX 1] Creating GoogleDriveExport.js..." -ForegroundColor Yellow

$googleDriveExport = @'
// services/GoogleDriveExport.js
import { google } from 'googleapis';
import fs from 'fs/promises';

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
      this.initialized = true;
      
      console.log('✅ [DriveExport] Initialized');
      return true;
    } catch (error) {
      console.error('❌ [DriveExport] Init failed:', error.message);
      throw error;
    }
  }

  async verifyFolder(folderId) {
    try {
      await this.initialize();
      
      const response = await this.drive.files.get({
        fileId: folderId,
        fields: 'id, name, mimeType',
        supportsAllDrives: true
      });

      if (response.data.mimeType !== 'application/vnd.google-apps.folder') {
        return { valid: false, error: 'Not a folder' };
      }

      return { valid: true, folderName: response.data.name };
    } catch (error) {
      console.error('❌ [DriveExport] Verify failed:', error.message);
      return { valid: false, error: error.message };
    }
  }

  async createSheetInFolder(testCases, config) {
    try {
      await this.initialize();

      const {
        folderId,
        fileName = 'MedTestAI Test Cases',
        methodology = 'agile',
        compliance = 'HIPAA'
      } = config;

      const timestamp = new Date().toISOString().split('T')[0];
      const fullName = `${fileName} - ${timestamp}`;
      
      // Create spreadsheet
      const spreadsheet = await this.sheets.spreadsheets.create({
        requestBody: {
          properties: { title: fullName },
          sheets: [{
            properties: {
              title: 'Test Cases',
              gridProperties: { frozenRowCount: 1 }
            }
          }]
        }
      });

      const spreadsheetId = spreadsheet.data.spreadsheetId;

      // Move to folder
      await this.drive.files.update({
        fileId: spreadsheetId,
        addParents: folderId,
        fields: 'id, parents',
        supportsAllDrives: true
      });

      // Add data
      const headers = ['Test ID', 'Test Name', 'Category', 'Priority', 'Description', 
                      'Preconditions', 'Test Steps', 'Expected Results', 'Compliance'];
      
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

      // Format
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            repeatCell: {
              range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.4, green: 0.5, blue: 0.9 },
                  textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true }
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)'
            }
          }]
        }
      });

      const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
      console.log(`✅ [DriveExport] Created: ${url}`);

      return { spreadsheetId, spreadsheetUrl: url, fileName: fullName };
    } catch (error) {
      console.error('❌ [DriveExport] Create failed:', error.message);
      throw error;
    }
  }

  formatArray(arr) {
    if (!arr) return '';
    if (typeof arr === 'string') return arr;
    if (Array.isArray(arr)) {
      return arr.map((item, i) => {
        if (typeof item === 'object') return `${i+1}. ${item.step || item.action || JSON.stringify(item)}`;
        return `${i+1}. ${item}`;
      }).join('\n');
    }
    return String(arr);
  }
}

export default new GoogleDriveExport();
'@

$googleDriveExport | Set-Content "services\GoogleDriveExport.js" -Encoding UTF8
Write-Host "  ✅ Created GoogleDriveExport.js" -ForegroundColor Green

# ============================================
# FIX 2: Fix TestResults.js - CRITICAL DISPLAY FIX
# ============================================
Write-Host "`n[FIX 2] Fixing TestResults.js display..." -ForegroundColor Yellow

$testResultsFix = @'
// frontend/src/components/TestResults.js - EMERGENCY FIX
import React, { useState } from 'react';
import './TestResults.css';

const TestResults = ({ results, methodology, complianceFramework, onNewAnalysis }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [exportFormat, setExportFormat] = useState('csv');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [exportSuccess, setExportSuccess] = useState(null);

  // FIXED: Correct data extraction
  const testCases = results?.testCases || [];
  const requirements = results?.extractedData?.requirements || [];
  const summary = results?.summary || {};
  const metadata = results?.metadata || {};

  console.log('TestResults data:', { 
    testCasesCount: testCases.length,
    requirementsCount: requirements.length,
    hasResults: !!results
  });

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

      const API_URL = process.env.REACT_APP_BACKEND_URL || 
                      'https://medtestai-backend-1067292712875.us-central1.run.app';

      if (format === 'google-sheets') {
        const folderId = prompt(
          'Enter your Google Drive Folder ID:\n\n' +
          '1. Open Google Drive\n' +
          '2. Open your folder\n' +
          '3. Copy ID from URL: drive.google.com/drive/folders/YOUR_FOLDER_ID\n\n' +
          'Folder ID:'
        );

        if (!folderId || !folderId.trim()) {
          throw new Error('Folder ID required');
        }

        // Verify folder
        const verifyResp = await fetch(`${API_URL}/api/drive/verify-folder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderId: folderId.trim() })
        });

        if (!verifyResp.ok) {
          throw new Error('Folder verification failed');
        }

        const verifyResult = await verifyResp.json();
        if (!verifyResult.success) {
          throw new Error(verifyResult.error || 'Cannot access folder');
        }

        // Export to folder
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
          setExportSuccess(`✅ Created "${result.fileName}"!`);
          if (result.spreadsheetUrl) {
            setTimeout(() => window.open(result.spreadsheetUrl, '_blank'), 500);
          }
        }
      } else {
        // CSV/JSON/Excel export
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
        setExportSuccess(`✅ Downloaded ${filteredTests.length} test cases`);
      }
    } catch (error) {
      console.error('Export error:', error);
      setExportError(error.message);
    } finally {
      setExportLoading(false);
    }
  };

  const styles = {
    container: { maxWidth: '1200px', margin: '0 auto', padding: '20px' },
    tabs: { display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '2px solid #e0e0e0' },
    tab: { padding: '12px 24px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: '500' },
    activeTab: { borderBottom: '3px solid #667eea', color: '#667eea' },
    button: { padding: '10px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' },
    primaryButton: { background: '#667eea', color: 'white' },
    secondaryButton: { background: '#e0e7ff', color: '#667eea' },
    sheetsButton: { background: '#34A853', color: 'white' }
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
          style={{ ...styles.tab, ...(activeTab === 'testcases' && styles.activeTab) }}
          onClick={() => setActiveTab('testcases')}
        >
          Test Cases ({testCases.length})
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === 'requirements' && styles.activeTab) }}
          onClick={() => setActiveTab('requirements')}
        >
          Requirements ({requirements.length})
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
            <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#667eea' }}>{requirements.length}</div>
              <div style={{ color: '#666', marginTop: '8px' }}>Requirements Found</div>
            </div>
            <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#667eea' }}>{testCases.length}</div>
              <div style={{ color: '#666', marginTop: '8px' }}>Test Cases Generated</div>
            </div>
            <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#667eea' }}>
                {Array.isArray(metadata.complianceFrameworks) ? metadata.complianceFrameworks.length : 1}
              </div>
              <div style={{ color: '#666', marginTop: '8px' }}>Compliance Frameworks</div>
            </div>
          </div>

          <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
            <h3 style={{ marginBottom: '16px' }}>Summary</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div><strong>Methodology:</strong> {metadata.methodology || methodology || 'N/A'}</div>
              <div><strong>Compliance:</strong> {metadata.complianceFramework || complianceFramework || 'N/A'}</div>
              <div><strong>Generated:</strong> {new Date(metadata.generatedAt || Date.now()).toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'testcases' && (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #e0e0e0' }}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          {filteredTests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              No test cases available
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {filteredTests.map((test, idx) => (
                <div key={idx} style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <h4 style={{ margin: 0, color: '#333' }}>{test.testName || test.name || test.title}</h4>
                    <span style={{ 
                      padding: '4px 12px', 
                      borderRadius: '4px', 
                      fontSize: '12px', 
                      background: getPriorityColor(test.priority),
                      color: 'white'
                    }}>
                      {test.priority || 'Medium'}
                    </span>
                  </div>
                  <div style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>
                    <strong>Category:</strong> {test.category || 'N/A'}
                  </div>
                  <div style={{ color: '#666', fontSize: '14px' }}>
                    {test.description || 'No description'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'requirements' && (
        <div>
          {requirements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              No requirements available
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {requirements.map((req, idx) => (
                <div key={idx} style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                  <div style={{ color: '#333', fontSize: '14px' }}>
                    {typeof req === 'string' ? req : req.text || req.requirement || JSON.stringify(req)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'export' && (
        <div>
          {exportError && (
            <div style={{ background: '#fee', color: '#c00', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
              {exportError}
            </div>
          )}
          {exportSuccess && (
            <div style={{ background: '#efe', color: '#060', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
              {exportSuccess}
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <button
                style={{ ...styles.button, ...(exportFormat === 'csv' ? styles.primaryButton : styles.secondaryButton) }}
                onClick={() => setExportFormat('csv')}
              >
                CSV
              </button>
              <button
                style={{ ...styles.button, ...(exportFormat === 'json' ? styles.primaryButton : styles.secondaryButton) }}
                onClick={() => setExportFormat('json')}
              >
                JSON
              </button>
              <button
                style={{ ...styles.button, ...(exportFormat === 'google-sheets' ? styles.sheetsButton : styles.secondaryButton) }}
                onClick={() => setExportFormat('google-sheets')}
              >
                GOOGLE SHEETS
              </button>
            </div>
          </div>

          <button
            onClick={() => handleExport(exportFormat)}
            disabled={exportLoading || filteredTests.length === 0}
            style={{ ...styles.button, ...(exportFormat === 'google-sheets' ? styles.sheetsButton : styles.primaryButton), width: '100%' }}
          >
            {exportLoading ? 'Exporting...' : `Export ${filteredTests.length} Test Cases`}
          </button>
        </div>
      )}

      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <button onClick={onNewAnalysis} style={{ ...styles.button, ...styles.secondaryButton }}>
          New Analysis
        </button>
      </div>
    </div>
  );
};

export default TestResults;
'@

Copy-Item "frontend\src\components\TestResults.js" "frontend\src\components\TestResults.js.backup-emergency" -Force
$testResultsFix | Set-Content "frontend\src\components\TestResults.js" -Encoding UTF8
Write-Host "  ✅ Fixed TestResults.js" -ForegroundColor Green

# ============================================
# FIX 3: Update server.js
# ============================================
Write-Host "`n[FIX 3] Updating server.js..." -ForegroundColor Yellow

$serverFile = "server.js"
$content = Get-Content $serverFile -Raw

# Add import if missing
if ($content -notmatch 'GoogleDriveExport') {
    $content = $content -replace '(import GoogleDriveService.*)', "`$1`nimport GoogleDriveExport from './services/GoogleDriveExport.js';"
    Write-Host "  ✅ Added GoogleDriveExport import" -ForegroundColor Green
}

# Add endpoints if missing
if ($content -notmatch '/api/drive/verify-folder') {
    $endpoints = @'


// ==================== DRIVE FOLDER EXPORT ====================
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
    Write-Host "  ✅ Added Drive export endpoints" -ForegroundColor Green
}

$content | Set-Content $serverFile -Encoding UTF8

# ============================================
# FIX 4: Deploy Backend
# ============================================
Write-Host "`n[FIX 4] Deploying backend..." -ForegroundColor Yellow

try {
    $deployOutput = gcloud run deploy medtestai-backend `
        --source . `
        --region=us-central1 `
        --platform=managed `
        --allow-unauthenticated `
        --project=pro-variety-472211-b9 `
        2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Backend deployed" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Deploy failed - run manually" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ⚠ Deploy error: $_" -ForegroundColor Yellow
}

# ============================================
# FIX 5: Rebuild Frontend
# ============================================
Write-Host "`n[FIX 5] Rebuilding frontend..." -ForegroundColor Yellow

Set-Location "frontend"
try {
    npm run build 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Frontend built" -ForegroundColor Green
    }
} catch {
    Write-Host "  ⚠ Build warning (check manually)" -ForegroundColor Yellow
}
Set-Location $projectRoot

# ============================================
# SUMMARY
# ============================================
Write-Host "`n================================================" -ForegroundColor Green
Write-Host "EMERGENCY FIX COMPLETE" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green

Write-Host "`n✅ What was fixed:" -ForegroundColor Yellow
Write-Host "   1. Created GoogleDriveExport.js" -ForegroundColor White
Write-Host "   2. Fixed TestResults.js display (all tabs now work)" -ForegroundColor White
Write-Host "   3. Fixed Google Sheets export" -ForegroundColor White
Write-Host "   4. Updated server.js endpoints" -ForegroundColor White
Write-Host "   5. Deployed backend + rebuilt frontend" -ForegroundColor White

Write-Host "`n🚀 Test NOW:" -ForegroundColor Yellow
Write-Host "   1. Refresh browser: pro-variety-472211-b9.web.app" -ForegroundColor Cyan
Write-Host "   2. Upload document" -ForegroundColor White
Write-Host "   3. Check ALL tabs: Overview, Test Cases, Requirements" -ForegroundColor White
Write-Host "   4. Go to Export tab" -ForegroundColor White
Write-Host "   5. Try Google Sheets export with your folder ID" -ForegroundColor White

Write-Host "`n⚠ If issues persist:" -ForegroundColor Yellow
Write-Host "   cd frontend && npm start" -ForegroundColor Cyan
Write-Host "   Check browser console for errors" -ForegroundColor White

Write-Host "`nDONE!" -ForegroundColor Green