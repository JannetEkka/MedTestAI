// services/testCaseGenerator.js - With comprehensive logging
import { GoogleGenerativeAI } from '@google/generative-ai';

class TestCaseGenerator {
  constructor() {
    this.genAI = null;
    this.model = null;
    this.apiKey = process.env.GEMINI_API_KEY;
    
    console.log('🚀 [TestCaseGenerator] Initializing...');
  }

  async initialize() {
    const startTime = Date.now();
    console.log('📝 [TestCaseGenerator] STEP 1: Starting initialization');
    
    try {
      if (!this.apiKey) {
        throw new Error('GEMINI_API_KEY not found in environment variables');
      }

      console.log('📝 [TestCaseGenerator] STEP 2: Creating GoogleGenerativeAI client');
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      
      console.log('📝 [TestCaseGenerator] STEP 3: Loading Gemini model (gemini-1.5-flash)');
      this.model = this.genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        }
      });
      
      const duration = Date.now() - startTime;
      console.log(`✅ [TestCaseGenerator] Initialization complete in ${duration}ms`);
      console.log('✅ [TestCaseGenerator] Model: gemini-1.5-flash');
      console.log('✅ [TestCaseGenerator] Ready to generate test cases');
      
      return true;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [TestCaseGenerator] Initialization failed after ${duration}ms`);
      console.error('❌ [TestCaseGenerator] Error:', error.message);
      throw error;
    }
  }

  async generateTestCases(requirements, methodology = 'agile', compliance = 'HIPAA') {
    const startTime = Date.now();
    console.log('\n' + '='.repeat(80));
    console.log('🧪 [TestCaseGenerator] STARTING TEST CASE GENERATION');
    console.log('='.repeat(80));
    console.log(`📋 [TestCaseGenerator] Requirements: ${requirements.length} items`);
    console.log(`🔧 [TestCaseGenerator] Methodology: ${methodology}`);
    console.log(`🔒 [TestCaseGenerator] Compliance: ${compliance}`);
    
    try {
      // Step 1: Ensure model is initialized
      if (!this.model) {
        console.log('⚠️  [TestCaseGenerator] Model not initialized, initializing now...');
        await this.initialize();
      }

      // Step 2: Build prompt
      console.log('📝 [TestCaseGenerator] STEP 1: Building AI prompt...');
      const prompt = this.buildHealthcarePrompt(requirements, methodology, compliance);
      console.log(`📝 [TestCaseGenerator] Prompt length: ${prompt.length} characters`);

      // Step 3: Call Gemini API
      console.log('🤖 [TestCaseGenerator] STEP 2: Calling Gemini API...');
      const apiStartTime = Date.now();
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const apiDuration = Date.now() - apiStartTime;
      console.log(`✅ [TestCaseGenerator] API call completed in ${apiDuration}ms`);
      console.log(`📊 [TestCaseGenerator] Response length: ${text.length} characters`);
      
      // Log token usage if available
      if (result.response.usageMetadata) {
        console.log(`💰 [TestCaseGenerator] Tokens used:`, result.response.usageMetadata);
      }

      // Step 4: Parse response
      console.log('🔍 [TestCaseGenerator] STEP 3: Parsing AI response...');
      const testData = this.parseTestCaseResponse(text);
      
      console.log(`✅ [TestCaseGenerator] Parsed ${testData.testCases?.length || 0} test cases`);
      
      // Step 5: Add metadata
      console.log('📝 [TestCaseGenerator] STEP 4: Adding metadata...');
      testData.generatedAt = new Date().toISOString();
      testData.methodology = methodology;
      testData.complianceFramework = compliance;
      testData.aiModel = 'gemini-1.5-flash';
      testData.processingTime = `${Date.now() - startTime}ms`;
      
      // Step 6: Apply compliance rules
      console.log(`🔒 [TestCaseGenerator] STEP 5: Applying ${compliance} compliance rules...`);
      const enhancedData = this.applyComplianceRules(testData, compliance);
      
      const totalDuration = Date.now() - startTime;
      console.log('\n' + '='.repeat(80));
      console.log('✅ [TestCaseGenerator] TEST CASE GENERATION COMPLETE');
      console.log('='.repeat(80));
      console.log(`📊 [TestCaseGenerator] Total test cases: ${enhancedData.testCases?.length || 0}`);
      console.log(`⏱️  [TestCaseGenerator] Total time: ${totalDuration}ms`);
      console.log(`🔒 [TestCaseGenerator] Compliance: ${compliance} rules applied`);
      console.log('='.repeat(80) + '\n');
      
      return enhancedData;
      
    } catch (error) {
      const totalDuration = Date.now() - startTime;
      console.error('\n' + '='.repeat(80));
      console.error('❌ [TestCaseGenerator] TEST CASE GENERATION FAILED');
      console.error('='.repeat(80));
      console.error(`❌ [TestCaseGenerator] Error: ${error.message}`);
      console.error(`⏱️  [TestCaseGenerator] Failed after: ${totalDuration}ms`);
      console.error('='.repeat(80) + '\n');
      throw new Error(`Test generation failed: ${error.message}`);
    }
  }

  buildHealthcarePrompt(requirements, methodology, compliance) {
    console.log(`📝 [TestCaseGenerator] Building prompt with ${methodology} methodology`);
    
    return `You are a healthcare software testing expert. Generate comprehensive test cases for healthcare software.

REQUIREMENTS:
${JSON.stringify(requirements, null, 2)}

TESTING METHODOLOGY: ${methodology}
COMPLIANCE FRAMEWORK: ${compliance}

Generate test cases in this EXACT JSON format:
{
  "testCases": [
    {
      "testId": "TC001",
      "testName": "Descriptive test name",
      "category": "functional|security|performance|usability",
      "priority": "High|Medium|Low",
      "description": "Clear test description",
      "preconditions": ["condition1", "condition2"],
      "testSteps": [
        {
          "step": 1,
          "action": "User action to perform",
          "expectedResult": "Expected outcome",
          "testData": "Required test data"
        }
      ],
      "expectedResult": "Overall expected result",
      "complianceRequirements": ["${compliance} rule 1", "${compliance} rule 2"],
      "riskLevel": "High|Medium|Low",
      "automationPotential": "High|Medium|Low",
      "testingTechnique": "boundary-value|equivalence-partitioning|decision-table"
    }
  ],
  "summary": {
    "totalTestCases": 0,
    "coverage": 0,
    "highPriorityCount": 0,
    "complianceFramework": "${compliance}",
    "categoriesCount": {
      "functional": 0,
      "security": 0,
      "performance": 0,
      "usability": 0
    }
  }
}

Generate 5-8 comprehensive test cases focusing on:
1. Healthcare workflows and clinical safety
2. ${compliance} compliance requirements
3. Patient data protection and privacy
4. ${methodology} methodology best practices
5. Error handling and edge cases

Return ONLY valid JSON, no markdown formatting.`;
  }

  parseTestCaseResponse(text) {
    console.log('🔍 [TestCaseGenerator] Parsing response text...');
    
    try {
      // Remove markdown code blocks if present
      let cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      console.log('🔍 [TestCaseGenerator] Attempting JSON parse...');
      const parsed = JSON.parse(cleanText);
      
      console.log(`✅ [TestCaseGenerator] Successfully parsed JSON`);
      console.log(`📊 [TestCaseGenerator] Found ${parsed.testCases?.length || 0} test cases`);
      
      // Validate structure
      if (!parsed.testCases || !Array.isArray(parsed.testCases)) {
        console.warn('⚠️  [TestCaseGenerator] Invalid structure: testCases array missing');
        return { testCases: [], summary: {} };
      }
      
      return parsed;
      
    } catch (error) {
      console.error('❌ [TestCaseGenerator] JSON parse error:', error.message);
      console.error('❌ [TestCaseGenerator] Returning empty result');
      return { 
        testCases: [], 
        summary: {},
        parseError: error.message 
      };
    }
  }

  applyComplianceRules(testData, compliance) {
    console.log(`🔒 [TestCaseGenerator] Applying ${compliance} compliance rules...`);
    
    const rules = this.getComplianceRules(compliance);
    let appliedRulesCount = 0;
    
    // Enhance each test case with compliance requirements
    if (testData.testCases) {
      testData.testCases = testData.testCases.map((testCase, index) => {
        console.log(`🔒 [TestCaseGenerator] Processing test case ${index + 1}/${testData.testCases.length}`);
        
        // Ensure compliance requirements exist
        if (!testCase.complianceRequirements) {
          testCase.complianceRequirements = [];
        }
        
        // Add relevant compliance rules based on category
        if (testCase.category === 'security' || testCase.category === 'privacy') {
          testCase.complianceRequirements.push(...rules.security);
          appliedRulesCount += rules.security.length;
        }
        
        if (testCase.testName?.toLowerCase().includes('audit') || 
            testCase.description?.toLowerCase().includes('audit')) {
          testCase.complianceRequirements.push(...rules.auditLog);
          appliedRulesCount += rules.auditLog.length;
        }
        
        // Remove duplicates
        testCase.complianceRequirements = [...new Set(testCase.complianceRequirements)];
        
        return testCase;
      });
    }
    
    console.log(`✅ [TestCaseGenerator] Applied ${appliedRulesCount} compliance rules`);
    
    // Add compliance validation metadata
    testData.complianceValidation = {
      framework: compliance,
      rulesApplied: Object.values(rules).flat(),
      validatedAt: new Date().toISOString(),
      totalRulesApplied: appliedRulesCount
    };
    
    return testData;
  }

  getComplianceRules(compliance) {
    console.log(`📋 [TestCaseGenerator] Loading ${compliance} compliance rules...`);
    
    const rules = {
      'HIPAA': {
        security: [
          'HIPAA Security Rule - Access Control',
          'HIPAA Security Rule - Audit Controls',
          'HIPAA Security Rule - Integrity Controls',
          'HIPAA Security Rule - Transmission Security'
        ],
        privacy: [
          'HIPAA Privacy Rule - Minimum Necessary',
          'HIPAA Privacy Rule - Notice of Privacy Practices',
          'HIPAA Privacy Rule - Patient Rights'
        ],
        auditLog: [
          'HIPAA Security Rule - Audit Log Requirements',
          'HIPAA Security Rule - Access Audit Trail'
        ]
      },
      'GDPR': {
        security: [
          'GDPR Article 32 - Security of Processing',
          'GDPR Article 25 - Data Protection by Design'
        ],
        privacy: [
          'GDPR Article 6 - Lawfulness of Processing',
          'GDPR Article 7 - Consent Requirements'
        ],
        auditLog: [
          'GDPR Article 30 - Records of Processing Activities'
        ]
      },
      'ABDM': {
        security: [
          'ABDM - Secure Data Storage',
          'ABDM - Authentication Requirements'
        ],
        privacy: [
          'ABDM - Patient Consent Framework',
          'ABDM - Data Minimization'
        ],
        auditLog: [
          'ABDM - Audit Trail Requirements'
        ]
      }
    };
    
    const selectedRules = rules[compliance] || rules['HIPAA'];
    console.log(`✅ [TestCaseGenerator] Loaded ${Object.keys(selectedRules).length} rule categories`);
    
    return selectedRules;
  }
}

export default new TestCaseGenerator();