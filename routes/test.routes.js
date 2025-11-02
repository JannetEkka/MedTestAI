// routes/test.routes.js
import express from 'express';
// ✅ CORRECT - Use Vertex AI version  
import testCaseGenerator from '../services/testCaseGeneratorMultiCompliance.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

router.post('/generate',
  asyncHandler(async (req, res) => {
    const { requirements, methodology, compliance } = req.body;
    
    if (!requirements || requirements.length === 0) {
      throw new Error('No requirements provided');
    }

    const testCases = await testCaseGenerator.generateTestCases(
      requirements,
      methodology || 'agile',
      compliance || 'HIPAA'
    );

    res.json({
      success: true,
      data: testCases
    });
  })
);

export default router;