// routes/feedback.routes.js
import express from 'express';
import FeedbackService from '../services/FeedbackService.js';

const router = express.Router();

// Record test execution
router.post('/execution', async (req, res) => {
  try {
    const { testCaseId, status, executionTime, errorMessage, metadata } = req.body;
    
    const id = await FeedbackService.recordTestExecution(
      testCaseId, status, executionTime, errorMessage, metadata
    );
    
    res.json({ success: true, executionId: id });
  } catch (error) {
    console.error('âŒ Failed to record execution:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Record user feedback
router.post('/feedback', async (req, res) => {
  try {
    const { testCaseId, feedbackType, feedbackText, userId } = req.body;
    
    const id = await FeedbackService.recordFeedback(
      testCaseId, feedbackType, feedbackText, userId
    );
    
    res.json({ success: true, feedbackId: id });
  } catch (error) {
    console.error('âŒ Failed to record feedback:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get test effectiveness score
router.get('/effectiveness/:testCaseId', async (req, res) => {
  try {
    const score = await FeedbackService.getTestEffectivenessScore(
      req.params.testCaseId
    );
    
    res.json({ success: true, score });
  } catch (error) {
    console.error('âŒ Failed to get effectiveness:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get insights for automation
router.get('/insights', async (req, res) => {
  try {
    const [topTests, lowTests] = await Promise.all([
      FeedbackService.getTopPerformingTests(10),
      FeedbackService.getLowPerformingTests(10)
    ]);
    
    res.json({
      success: true,
      insights: {
        topPerformers: topTests,
        needsImprovement: lowTests,
        recommendations: {
          prioritize: topTests.map(t => t.test_case_id),
          review: lowTests.map(t => t.test_case_id)
        }
      }
    });
  } catch (error) {
    console.error('âŒ Failed to get insights:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;