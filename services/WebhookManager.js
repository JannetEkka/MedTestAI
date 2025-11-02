// services/WebhookManager.js
// UPDATED: Uses Vertex AI SDK with Application Default Credentials (ADC)

import { VertexAI } from '@google-cloud/vertexai'; // NEW: Vertex AI SDK
import dotenv from 'dotenv';

dotenv.config();

/**
 * Webhook Manager for MedTestAI
 * Handles webhook registration and test case generation triggers
 */
class WebhookManager {
  constructor() {
    this.webhooks = new Map();
    this.model = null;
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT;
    this.location = 'us-central1';
  }

  async initialize() {
    try {
      console.log('🔗 [WebhookManager] Initializing with Vertex AI...');
      
      if (!this.projectId) {
        throw new Error('GOOGLE_CLOUD_PROJECT not configured');
      }

      // Initialize Vertex AI client using ADC
      const vertex_ai = new VertexAI({
        project: this.projectId,
        location: this.location
      });
      
      this.model = vertex_ai.preview.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.7,
          topP: 0.95,
          responseMimeType: "application/json"
        }
      });

      console.log('✅ [WebhookManager] Webhook manager initialized with Vertex AI ADC');
      return true;
    } catch (error) {
      console.error('❌ [WebhookManager] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Register a new webhook
   */
  registerWebhook(webhookId, config) {
    this.webhooks.set(webhookId, {
      id: webhookId,
      url: config.url,
      events: config.events || ['test.generation.requested'],
      secret: config.secret,
      active: true,
      createdAt: new Date(),
      lastTriggered: null
    });

    console.log(`✅ [WebhookManager] Webhook registered: ${webhookId}`);
    return this.webhooks.get(webhookId);
  }

  /**
   * Trigger webhook for test case generation
   */
  async triggerWebhook(webhookId, payload) {
    const webhook = this.webhooks.get(webhookId);
    
    if (!webhook || !webhook.active) {
      throw new Error(`Webhook not found or inactive: ${webhookId}`);
    }

    try {
      console.log(`🔔 [WebhookManager] Triggering webhook: ${webhookId}`);
      
      // Generate test cases using Vertex AI
      const testCases = await this.generateTestCases(payload.requirements, payload.options);
      
      // Update webhook last triggered time
      webhook.lastTriggered = new Date();
      
      // Return results
      return {
        webhookId,
        status: 'success',
        testCases,
        triggeredAt: webhook.lastTriggered
      };
    } catch (error) {
      console.error(`❌ [WebhookManager] Webhook trigger failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate test cases using Vertex AI
   */
  async generateTestCases(requirements, options = {}) {
    await this.initialize();

    const {
      methodology = 'agile',
      complianceFrameworks = ['hipaa'],
      priority = 'all'
    } = options;

    const prompt = `Generate comprehensive healthcare test cases:

Requirements:
${JSON.stringify(requirements, null, 2)}

Configuration:
- Methodology: ${methodology}
- Compliance: ${complianceFrameworks.join(', ')}
- Priority: ${priority}

Generate test cases in JSON format:
{
  "testCases": [
    {
      "id": "TC-001",
      "title": "Test case title",
      "description": "Description",
      "requirement_id": "REQ-001",
      "priority": "High|Medium|Low",
      "type": "Functional|Security|Compliance",
      "steps": [
        {
          "step": 1,
          "action": "Action to perform",
          "expected": "Expected result"
        }
      ],
      "compliance": ["HIPAA"],
      "tags": ["tag1"]
    }
  ],
  "summary": {
    "total_test_cases": 0,
    "by_priority": {},
    "by_type": {}
  }
}`;

    try {
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      const response = result.response;
      const text = response.candidates[0].content.parts[0].text;

      // Clean and parse JSON
      const cleanedText = text
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      return JSON.parse(cleanedText);
    } catch (error) {
      console.error('❌ [WebhookManager] Test case generation failed:', error);
      throw error;
    }
  }

  /**
   * List all registered webhooks
   */
  listWebhooks() {
    return Array.from(this.webhooks.values());
  }

  /**
   * Get webhook by ID
   */
  getWebhook(webhookId) {
    return this.webhooks.get(webhookId);
  }

  /**
   * Delete webhook
   */
  deleteWebhook(webhookId) {
    const deleted = this.webhooks.delete(webhookId);
    
    if (deleted) {
      console.log(`✅ [WebhookManager] Webhook deleted: ${webhookId}`);
    }
    
    return deleted;
  }

  /**
   * Update webhook configuration
   */
  updateWebhook(webhookId, updates) {
    const webhook = this.webhooks.get(webhookId);
    
    if (!webhook) {
      throw new Error(`Webhook not found: ${webhookId}`);
    }

    Object.assign(webhook, updates);
    this.webhooks.set(webhookId, webhook);
    
    console.log(`✅ [WebhookManager] Webhook updated: ${webhookId}`);
    return webhook;
  }
}

export default new WebhookManager();