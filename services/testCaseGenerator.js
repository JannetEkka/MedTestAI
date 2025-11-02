// services/testCaseGenerator.js - UPDATED FOR VERTEX AI
import { VertexAI } from '@google-cloud/vertexai';

class TestCaseGenerator {
  constructor() {
    this.vertex = null;
    this.model = null;
    
    console.log('🚀 [TestCaseGenerator] Initializing...');
  }

  async initialize() {
    const startTime = Date.now();
    console.log('📝 [TestCaseGenerator] STEP 1: Starting initialization');
    
    try {
      console.log('📝 [TestCaseGenerator] STEP 2: Creating Vertex AI client');
      this.vertex = new VertexAI({
        project: process.env.GOOGLE_CLOUD_PROJECT || 'pro-variety-472211-b9',
        location: 'us-central1'
      });
      
      console.log('📝 [TestCaseGenerator] STEP 3: Loading Gemini model (gemini-2.5-flash)');
      this.model = this.vertex.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        }
      });
      
      const duration = Date.now() - startTime;
      console.log(`✅ [TestCaseGenerator] Initialization complete in ${duration}ms`);
      console.log('✅ [TestCaseGenerator] Model: gemini-2.5-flash');
      console.log('✅ [TestCaseGenerator] Authentication: ADC (Application Default Credentials)');
      console.log('✅ [TestCaseGenerator] Ready to generate test cases');
      
      return true;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [TestCaseGenerator] Initialization failed after ${duration}ms`);
      console.error('❌ [TestCaseGenerator] Error:', error.message);
      console.error('❌ [TestCaseGenerator] Make sure:');
      console.error('   1. GOOGLE_APPLICATION_CREDENTIALS is set');
      console.error('   2. Service account has "AI Platform User" role');
      console.error('   3. Vertex AI API is enabled');
      throw error;
    }
  }

  async generateTestCases(requirements, methodology = 'agile', compliance = 'HIPAA') {
    const startTime = Date.now();
    console.log('\n' + '='.repeat(80));
    console.log('🧪 [TestCaseGenerator] Starting TEST CASE GENERATION');
    console.log('='.repeat(80));
    console.log(`📋 Requirements: ${Array.isArray(requirements) ? requirements.length : 1}`);
    console.log(`🔧 Methodology: ${methodology}`);
    console.log(`🛡️  Compliance: ${compliance}`);
    console.log('');
    
    try {
      // Initialize if not already done
      if (!this.model) {
        console.log('⚙️  [TestCaseGenerator] Model not initialized, initializing now...');
        await this.initialize();
      }
      
      console.log('📝 [TestCaseGenerator] Building prompt...');
      const prompt = this.buildPrompt(requirements, methodology, compliance);
      console.log(`✅ [TestCaseGenerator] Prompt ready (${prompt.length} characters)`);
      
      console.log('🤖 [TestCaseGenerator] Sending request to Vertex AI...');
      const genStart = Date.now();
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const genDuration = Date.now() - genStart;
      console.log(`✅ [TestCaseGenerator] Response received in ${genDuration}ms`);
      console.log(`📊 [TestCaseGenerator] Response length: ${text.length} characters`);
      
      console.log('🔄 [TestCaseGenerator] Parsing JSON response...');
      let testCases;
      try {
        const cleanedText = this.cleanJsonResponse(text);
        testCases = JSON.parse(cleanedText);
        console.log(`✅ [TestCaseGenerator] Parsed ${testCases.testCases?.length || 0} test cases`);
      } catch (parseError) {
        console.error('❌ [TestCaseGenerator] JSON parsing failed:', parseError.message);
        console.error('Raw response (first 500 chars):', text.substring(0, 500));
        throw new Error(`Failed to parse AI response: ${parseError.message}`);
      }
      
      // Validate and enhance test cases
      if (!testCases.testCases || !Array.isArray(testCases.testCases)) {
        throw new Error('Invalid response format: missing testCases array');
      }
      
      // Add metadata to each test case
      testCases.testCases = testCases.testCases.map((tc, index) => ({
        ...tc,
        id: tc.id || `TC_${String(index + 1).padStart(3, '0')}`,
        generatedAt: new Date().toISOString(),
        methodology: methodology,
        complianceFramework: compliance
      }));
      
      const totalDuration = Date.now() - startTime;
      console.log('');
      console.log('='.repeat(80));
      console.log('✅ [TestCaseGenerator] GENERATION COMPLETE');
      console.log('='.repeat(80));
      console.log(`⏱️  Total Duration: ${totalDuration}ms`);
      console.log(`📋 Test Cases Generated: ${testCases.testCases.length}`);
      console.log(`🔧 Methodology: ${methodology}`);
      console.log(`🛡️  Compliance: ${compliance}`);
      console.log('');
      
      return testCases;
      
    } catch (error) {
      const totalDuration = Date.now() - startTime;
      console.error('');
      console.error('='.repeat(80));
      console.error('❌ [TestCaseGenerator] GENERATION FAILED');
      console.error('='.repeat(80));
      console.error(`⏱️  Failed after: ${totalDuration}ms`);
      console.error(`❌ Error: ${error.message}`);
      console.error('');
      
      throw new Error(`Test case generation failed: ${error.message}`);
    }
  }
  
  /**
   * Clean JSON response from markdown blocks
   */
  cleanJsonResponse(text) {
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid response: empty or non-string');
    }

    let cleaned = text.trim();
    
    // Remove markdown code blocks
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*\n?/, '').replace(/\n?```\s*$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    
    // Remove HTML if present
    if (cleaned.includes('<!DOCTYPE') || cleaned.includes('<html')) {
      throw new Error('Received HTML error page instead of JSON');
    }
    
    cleaned = cleaned.trim();
    
    // Validate JSON start
    if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
      throw new Error('Response does not start with valid JSON');
    }
    
    return cleaned;
  }
  
  /**
   * Build comprehensive prompt for test generation
   */
  buildPrompt(requirements, methodology, compliance) {
    const reqText = Array.isArray(requirements) 
      ? requirements.map((r, i) => `${i + 1}. ${typeof r === 'object' ? r.text : r}`).join('\n')
      : requirements;
    
    return `You are an expert healthcare QA engineer. Generate comprehensive test cases for the following requirements.

**CRITICAL INSTRUCTIONS:**
1. Return ONLY valid JSON - no markdown, no explanations, no code blocks
2. Follow the exact structure specified below
3. Each test case must have all required fields
4. Make test cases specific and actionable

**Requirements:**
${reqText}

**Testing Methodology:** ${methodology}
**Compliance Framework:** ${compliance}

**Required JSON Structure:**
{
  "testCases": [
    {
      "id": "TC_001",
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
      "complianceRequirements": ["${compliance} requirement"],
      "automationPotential": "High|Medium|Low",
      "tags": ["tag1", "tag2"]
    }
  ],
  "metadata": {
    "totalTests": 0,
    "methodology": "${methodology}",
    "complianceFramework": "${compliance}",
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
- Address ${compliance} compliance
- Are realistic and executable

Return ONLY the JSON object. No explanations, no markdown formatting.`;
  }
}

// Export singleton instance
const testCaseGenerator = new TestCaseGenerator();
export default testCaseGenerator;