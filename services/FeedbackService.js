// services/FeedbackService.js
import { Pool } from 'pg';

class FeedbackService {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  async recordTestExecution(testCaseId, status, executionTime, errorMessage, metadata) {
    const query = `
      INSERT INTO test_execution_history 
        (test_case_id, status, execution_time_ms, error_message, 
         requirement_id, methodology, compliance_frameworks, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `;
    
    const values = [
      testCaseId,
      status,
      executionTime,
      errorMessage,
      metadata.requirementId,
      metadata.methodology,
      metadata.complianceFrameworks,
      metadata
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0].id;
  }

  async recordFeedback(testCaseId, feedbackType, feedbackText, userId) {
    const query = `
      INSERT INTO test_feedback 
        (test_case_id, feedback_type, feedback_text, user_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;
    
    const values = [testCaseId, feedbackType, feedbackText, userId];
    const result = await this.pool.query(query, values);
    return result.rows[0].id;
  }

  async getTestEffectivenessScore(testCaseId) {
    const query = `
      SELECT 
        COUNT(*) as total_executions,
        SUM(CASE WHEN status = 'fail' THEN 1 ELSE 0 END) as failures,
        AVG(execution_time_ms) as avg_execution_time,
        (SELECT COUNT(*) FROM test_feedback 
         WHERE test_case_id = $1 AND feedback_type = 'thumbs_up') as positive_feedback,
        (SELECT COUNT(*) FROM test_feedback 
         WHERE test_case_id = $1 AND feedback_type = 'thumbs_down') as negative_feedback
      FROM test_execution_history
      WHERE test_case_id = $1
      GROUP BY test_case_id
    `;
    
    const result = await this.pool.query(query, [testCaseId]);
    const data = result.rows[0];
    
    if (!data) return 0;

    // Calculate effectiveness score (0-100)
    const failureRate = data.failures / data.total_executions;
    const feedbackScore = (data.positive_feedback - data.negative_feedback) / 
                          Math.max(1, data.positive_feedback + data.negative_feedback);
    const speedScore = data.avg_execution_time < 5000 ? 1 : 0.5; // Fast tests = better

    return Math.round(
      (1 - failureRate) * 40 + // 40% weight on catching bugs
      (feedbackScore * 0.5 + 0.5) * 40 + // 40% weight on user feedback
      speedScore * 20 // 20% weight on execution speed
    );
  }

  async getTopPerformingTests(limit = 10) {
    const query = `
      SELECT 
        test_case_id,
        COUNT(*) as executions,
        SUM(CASE WHEN status = 'fail' THEN 1 ELSE 0 END) as defects_found,
        AVG(execution_time_ms) as avg_time
      FROM test_execution_history
      WHERE execution_date > NOW() - INTERVAL '30 days'
      GROUP BY test_case_id
      ORDER BY defects_found DESC, avg_time ASC
      LIMIT $1
    `;
    
    const result = await this.pool.query(query, [limit]);
    return result.rows;
  }

  async getLowPerformingTests(limit = 10) {
    const query = `
      SELECT 
        test_case_id,
        COUNT(*) as executions,
        SUM(CASE WHEN status = 'pass' THEN 1 ELSE 0 END) as passes,
        AVG(execution_time_ms) as avg_time,
        (SELECT COUNT(*) FROM test_feedback tf 
         WHERE tf.test_case_id = teh.test_case_id 
         AND feedback_type = 'thumbs_down') as negative_feedback
      FROM test_execution_history teh
      WHERE execution_date > NOW() - INTERVAL '30 days'
      GROUP BY test_case_id
      HAVING COUNT(*) > 5
      ORDER BY (passes::FLOAT / COUNT(*)) ASC, negative_feedback DESC
      LIMIT $1
    `;
    
    const result = await this.pool.query(query, [limit]);
    return result.rows;
  }
}

export default new FeedbackService();