// services/geminiService.js - UPDATED FOR VERTEX AI
import { VertexAI } from '@google-cloud/vertexai';
import dotenv from 'dotenv';

dotenv.config();

class GeminiService {
  constructor() {
    this.vertex = null;
    this.model = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) {
      return true;
    }

    try {
      console.log('🤖 [Vertex AI] Initializing Vertex AI service...');
      
      // Initialize Vertex AI with ADC (Application Default Credentials)
      this.vertex = new VertexAI({
        project: process.env.GOOGLE_CLOUD_PROJECT || 'pro-variety-472211-b9',
        location: 'us-central1'
      });
      
      console.log('✅ [Vertex AI] Project:', process.env.GOOGLE_CLOUD_PROJECT);
      console.log('✅ [Vertex AI] Location: us-central1');
      
      // Use Gemini 2.5 Flash (current stable model)
      this.model = this.vertex.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192
        }
      });
      
      this.isInitialized = true;
      console.log('✅ [Vertex AI] Gemini service initialized successfully');
      console.log('✅ [Vertex AI] Using model: gemini-2.5-flash');
      return true;
    } catch (error) {
      console.error('❌ [Vertex AI] Initialization failed:', error.message);
      console.error('❌ [Vertex AI] Make sure:');
      console.error('   1. GOOGLE_APPLICATION_CREDENTIALS is set');
      console.error('   2. Service account has "AI Platform User" role');
      console.error('   3. Vertex AI API is enabled');
      return false;
    }
  }

  /**
   * CRITICAL: Clean and validate JSON response from Gemini
   * Handles markdown code blocks, HTML, and other non-JSON content
   */
  cleanJsonResponse(text) {
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid response: empty or non-string');
    }

    let cleaned = text.trim();
    
    // Remove markdown code blocks (```json ... ```)
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*\n?/, '').replace(/\n?```\s*$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    
    // Remove HTML/DOCTYPE if present (error responses)
    if (cleaned.includes('<!DOCTYPE') || cleaned.includes('<html')) {
      throw new Error('Received HTML error page instead of JSON');
    }
    
    // Remove any leading/trailing whitespace
    cleaned = cleaned.trim();
    
    // Validate it starts with { or [
    if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
      console.error('Invalid JSON start:', cleaned.substring(0, 100));
      throw new Error('Response does not start with valid JSON');
    }
    
    return cleaned;
  }

  /**
   * Generate test cases with robust error handling
   */
  async generateTestCases(requirements, methodology = 'agile', complianceFrameworks = []) {
    console.log('🤖 [Vertex AI] Starting test case generation');
    console.log(`📋 [Vertex AI] Requirements: ${requirements.length}`);
    console.log(`🔧 [Vertex AI] Methodology: ${methodology}`);
    console.log(`🛡️ [Vertex AI] Compliance: ${complianceFrameworks.join(', ')}`);

    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.model) {
      throw new Error('Vertex AI service not initialized. Check authentication and API enablement.');
    }

    // Build comprehensive prompt
    const prompt = this.buildPrompt(requirements, methodology, complianceFrameworks);
    
    try {
      console.log('📤 [Vertex AI] Sending request to Vertex AI...');
      const startTime = Date.now();
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const rawText = response.text();
      
      const duration = Date.now() - startTime;
      console.log(`✅ [Vertex AI] Response received in ${duration}ms`);
      console.log(`📊 [Vertex AI] Response length: ${rawText.length} characters`);
      
      // CRITICAL: Clean and parse the response
      try {
        const cleanedText = this.cleanJsonResponse(rawText);
        const parsed = JSON.parse(cleanedText);
        
        // Validate response structure
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Parsed response is not an object');
        }
        
        if (!parsed.testCases || !Array.isArray(parsed.testCases)) {
          throw new Error('Response missing testCases array');
        }
        
        console.log(`✅ [Vertex AI] Successfully parsed ${parsed.testCases.length} test cases`);
        
        return {
          success: true,
          testCases: parsed.testCases,
          metadata: parsed.metadata || {},
          summary: parsed.summary || {}
        };
        
      } catch (parseError) {
        console.error('❌ [Vertex AI] JSON parsing failed:', parseError.message);
        console.error('Raw response (first 500 chars):', rawText.substring(0, 500));
        
        throw new Error(`Failed to parse Vertex AI response: ${parseError.message}. Please try again.`);
      }
      
    } catch (error) {
      console.error('❌ [Vertex AI] Generation failed:', error);
      
      // Provide helpful error messages
      if (error.message?.includes('quota')) {
        throw new Error('Vertex AI quota exceeded. Please check your project quota limits.');
      } else if (error.message?.includes('permission') || error.message?.includes('PERMISSION_DENIED')) {
        throw new Error('Permission denied. Ensure service account has "AI Platform User" role.');
      } else if (error.message?.includes('API key')) {
        throw new Error('Vertex AI does not use API keys. Using Application Default Credentials.');
      } else {
        throw new Error(`Vertex AI error: ${error.message}`);
      }
    }
  }

  /**
   * Build comprehensive prompt for healthcare test case generation
   */
  buildPrompt(requirements, methodology, complianceFrameworks) {
    const complianceText = complianceFrameworks.length > 0 
      ? complianceFrameworks.join(', ') 
      : 'HIPAA';

    return `You are an expert healthcare QA engineer. Generate comprehensive test cases for the following requirements.

**CRITICAL INSTRUCTIONS:**
1. Return ONLY valid JSON - no markdown, no explanations, no code blocks
2. Follow the exact structure specified below
3. Each test case must have all required fields
4. Make test cases specific and actionable

**Requirements:**
${requirements.map((req, i) => `${i + 1}. ${typeof req === 'object' ? req.text : req}`).join('\n')}

**Testing Methodology:** ${methodology}
**Compliance Frameworks:** ${complianceText}

**Required JSON Structure:**
{
  "testCases": [
    {
      "id": "TC_XXX_001",
      "title": "Clear, action-oriented test title",
      "description": "Detailed test description",
      "priority": "HIGH|MEDIUM|LOW",
      "category": "Functional|Security|Performance|Compliance|UI/UX",
      "riskLevel": "HIGH|MEDIUM|LOW",
      "estimatedTime": "15 minutes",
      "preconditions": ["Precondition 1", "Precondition 2"],
      "testSteps": [
        {
          "step": 1,
          "action": "Specific action to perform",
          "expectedResult": "Expected outcome"
        }
      ],
      "testData": {
        "inputs": ["Sample data 1", "Sample data 2"],
        "expectedOutputs": ["Expected result 1"]
      },
      "complianceRequirements": ["${complianceText} requirement"],
      "automationPotential": "High|Medium|Low",
      "tags": ["tag1", "tag2"]
    }
  ],
  "metadata": {
    "totalTests": 0,
    "methodology": "${methodology}",
    "complianceFrameworks": ${JSON.stringify(complianceFrameworks)},
    "generatedAt": "${new Date().toISOString()}"
  },
  "summary": {
    "byPriority": {"HIGH": 0, "MEDIUM": 0, "LOW": 0},
    "byCategory": {},
    "byRiskLevel": {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
  }
}

Generate test cases that:
- Cover all requirements completely
- Include security, compliance, and edge cases
- Are specific to healthcare context
- Follow ${methodology} methodology
- Address ${complianceText} compliance
- Are realistic and executable

Return ONLY the JSON object. No explanations, no markdown formatting.`;
  }
}

// Export singleton instance
const geminiService = new GeminiService();
export default geminiService;