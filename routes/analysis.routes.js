// routes/analysis.routes.js
import express from 'express';
import GapAnalysisService from '../services/GapAnalysisService.js';

const router = express.Router();

router.post('/gap-analysis', async (req, res) => {
  try {
    const { requirements, testCases, complianceFrameworks } = req.body;

    if (!requirements || !testCases) {
      return res.status(400).json({
        success: false,
        error: 'Requirements and test cases are required'
      });
    }

    const analysis = await GapAnalysisService.analyzeGaps(
      requirements,
      testCases,
      complianceFrameworks || ['HIPAA']
    );

    res.json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('Gap analysis failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;