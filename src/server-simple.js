const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'MedTestAI Healthcare Testing Platform'
  });
});

// Basic document upload endpoint (MVP)
app.post('/api/documents/process', (req, res) => {
  // Mock processing for demo
  res.json({
    success: true,
    message: 'Document processed successfully',
    extractedRequirements: [
      {
        id: 'REQ-001',
        text: 'System shall implement role-based access control for PHI',
        category: 'security',
        compliance: ['HIPAA'],
        risk: 'high'
      }
    ]
  });
});

// Mock test generation
app.post('/api/tests/generate', (req, res) => {
  const { methodology = 'agile' } = req.body;
  
  res.json({
    methodology,
    testCases: [
      {
        id: 'TC-001',
        title: methodology === 'agile' ? 
          'As a healthcare professional, I want secure access to patient records' :
          'Verify unauthorized access prevention to patient data',
        type: methodology === 'agile' ? 'user_story' : 'test_case'
      }
    ]
  });
});

app.listen(PORT, () => {
  console.log(`🚀 MedTestAI server running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
});