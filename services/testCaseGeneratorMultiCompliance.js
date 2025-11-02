// services/testCaseGeneratorMultiCompliance.js - FIXED VERTEX AI RESPONSE HANDLING
import { VertexAI } from '@google-cloud/vertexai';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Enhanced Test Case Generator with Multi-Compliance Support
 * Uses Vertex AI with Application Default Credentials
 */
class TestCaseGeneratorMultiCompliance {
  constructor() {
    this.vertex = null;
    this.model = null;
  }

  async initialize() {
    try {
      console.log('🤖 [TestGenerator] Initializing Vertex AI...');
      
      // Initialize Vertex AI with ADC
      this.vertex = new VertexAI({
        project: process.env.GOOGLE_CLOUD_PROJECT || 'pro-variety-472211-b9',
        location: 'us-central1'
      });
      
      // Use Gemini 2.0 Flash (experimental) for optimal performance
      this.model = this.vertex.preview.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.7,
          topP: 0.95,
          responseMimeType: 'application/json'
        }
      });

      console.log('✅ [TestGenerator] Multi-compliance test generator initialized');
      console.log('✅ [TestGenerator] Model: gemini-2.0-flash-exp');
      return true;
    } catch (error) {
      console.error('❌ [TestGenerator] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Get compliance-specific requirements
   */
  getComplianceRequirements(complianceFrameworks) {
    const allRequirements = {
      'hipaa': {
        name: 'HIPAA',
        requirements: [
          'Verify access control and authentication',
          'Test audit logging for PHI access',
          'Validate data encryption (at rest and in transit)',
          'Test breach notification procedures',
          'Verify minimum necessary access principle'
        ]
      },
      'fda-21-cfr-11': {
        name: 'FDA 21 CFR Part 11',
        requirements: [
          'Validate electronic signatures',
          'Test audit trail completeness',
          'Verify system validation documentation',
          'Test access control mechanisms',
          'Validate data integrity controls'
        ]
      },
      'gdpr': {
        name: 'GDPR',
        requirements: [
          'Test right to access (data portability)',
          'Verify right to erasure ("right to be forgotten")',
          'Test consent management',
          'Validate data breach notification (72 hours)',
          'Test privacy by design principles'
        ]
      },
      'hitrust': {
        name: 'HITRUST CSF',
        requirements: [
          'Test information security management',
          'Verify access control policies',
          'Test incident response procedures',
          'Validate risk management controls',
          'Test business continuity planning'
        ]
      },
      'soc2': {
        name: 'SOC 2',
        requirements: [
          'Test security controls',
          'Verify availability monitoring',
          'Test processing integrity',
          'Validate confidentiality controls',
          'Test privacy measures'
        ]
      },
      'iso-13485': {
        name: 'ISO 13485',
        requirements: [
          'Test design controls',
          'Verify risk management process',
          'Test corrective and preventive actions',
          'Validate document control',
          'Test traceability requirements'
        ]
      },
      'iso-27001': {
        name: 'ISO 27001',
        requirements: [
          'Test information security policies',
          'Verify asset management',
          'Test access control procedures',
          'Validate cryptography controls',
          'Test security incident management'
        ]
      },
      'abdm': {
        name: 'ABDM (Ayushman Bharat Digital Mission)',
        requirements: [
          'Test Health ID creation and linking',
          'Verify consent management framework',
          'Test interoperability with ABDM',
          'Validate data privacy controls',
          'Test secure health data exchange'
        ]
      }
    };

    return complianceFrameworks.map(fw => {
      const normalized = fw.toLowerCase().replace(/\s+/g, '-');
      return allRequirements[normalized] || { name: fw, requirements: [] };
    });
  }

  /**
   * Build comprehensive prompt
   */
  buildPrompt(requirements, methodology, complianceFrameworks) {
    const complianceData = this.getComplianceRequirements(complianceFrameworks);
    const complianceNames = complianceData.map(c => c.name).join(', ');
    
    const requirementsText = Array.isArray(requirements)
      ? requirements.map((r, i) => `${i + 1}. ${r}`).join('\n')
      : requirements;

    const prompt = `You are a healthcare software testing expert. Generate comprehensive test cases for the following requirements.

**Methodology:** ${methodology.toUpperCase()}
**Compliance Frameworks:** ${complianceNames}

**Requirements:**
${requirementsText}

**Compliance-Specific Testing Requirements:**
${complianceData.map(c => `\n${c.name}:\n${c.requirements.map(r => `  - ${r}`).join('\n')}`).join('\n')}

Generate 15-25 comprehensive test cases in the following JSON format:

{
  "testCases": [
    {
      "testId": "TC001",
      "testName": "Clear, descriptive test name",
      "category": "functional|security|compliance|performance|usability",
      "priority": "Critical|High|Medium|Low",
      "description": "Detailed description of what this test validates",
      "preconditions": ["List of preconditions"],
      "testSteps": [
        {"step": 1, "action": "Step description", "expectedResult": "What should happen"}
      ],
      "expectedResults": "Overall expected outcome",
      "complianceRequirements": ["${complianceNames}"],
      "riskLevel": "High|Medium|Low",
      "testingTechnique": "black-box|white-box|gray-box|boundary-value|equivalence-partitioning",
      "automationFeasibility": "High|Medium|Low"
    }
  ],
  "summary": {
    "totalTests": 20,
    "byPriority": {"Critical": 5, "High": 8, "Medium": 5, "Low": 2},
    "byCategory": {"functional": 10, "security": 5, "compliance": 5},
    "complianceCoverage": {}
  },
  "metadata": {
    "methodology": "${methodology}",
    "complianceFrameworks": ${JSON.stringify(complianceFrameworks)},
    "requirementsCount": ${Array.isArray(requirements) ? requirements.length : 1}
  }
}

Generate 15-25 comprehensive test cases. Return ONLY the JSON object.`;

    return prompt;
  }

  /**
   * Clean JSON response (remove markdown, validate)
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
    
    // Check for HTML
    if (cleaned.includes('<!DOCTYPE') || cleaned.includes('<html')) {
      throw new Error('Received HTML error page instead of JSON');
    }
    
    cleaned = cleaned.trim();
    
    // Validate starts with { or [
    if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
      console.error('Invalid JSON start:', cleaned.substring(0, 100));
      throw new Error('Response does not start with valid JSON');
    }
    
    return cleaned;
  }

  /**
   * Generate test cases with multi-compliance support
   * FIXED: Correct Vertex AI response handling
   */
  async generateTestCases(requirements, methodology = 'agile', complianceFrameworks = ['hipaa']) {
    try {
      console.log('\n🧪 [TestGenerator] Starting multi-compliance test generation...');
      console.log(`📋 [TestGenerator] Requirements: ${Array.isArray(requirements) ? requirements.length : 1}`);
      console.log(`🔧 [TestGenerator] Methodology: ${methodology}`);
      console.log(`🌍 [TestGenerator] Compliance: ${complianceFrameworks.join(', ')}`);

      if (!this.model) {
        console.log('⚠️  [TestGenerator] Model not initialized, initializing now...');
        await this.initialize();
      }

      if (!this.model) {
        throw new Error('Vertex AI model not initialized');
      }

      // Build prompt
      const prompt = this.buildPrompt(requirements, methodology, complianceFrameworks);
      
      console.log('🤖 [TestGenerator] Sending request to Vertex AI...');
      
      // Generate content using Vertex AI
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      // ✅ FIXED: Correct way to get text from Vertex AI response
      const response = result.response;
      
      // Check if response has candidates
      if (!response.candidates || response.candidates.length === 0) {
        throw new Error('No response candidates from Vertex AI');
      }

      // Extract text from the first candidate
      const text = response.candidates[0].content.parts[0].text;

      console.log('✅ [TestGenerator] Received response from Vertex AI');
      console.log(`📊 [TestGenerator] Response length: ${text.length} chars`);

      // Parse JSON response
      let testData;
      try {
        const cleanedText = this.cleanJsonResponse(text);
        testData = JSON.parse(cleanedText);
      } catch (parseError) {
        console.error('❌ [TestGenerator] JSON parse error:', parseError);
        console.error('Raw response:', text.substring(0, 500));
        throw new Error('Failed to parse AI response as JSON');
      }

      // Validate structure
      if (!testData.testCases || !Array.isArray(testData.testCases)) {
        throw new Error('Invalid test case format: missing testCases array');
      }

      // Enhance test cases with metadata
      testData.testCases = testData.testCases.map((tc, index) => ({
        ...tc,
        id: tc.id || tc.testId || `TC_${String(index + 1).padStart(3, '0')}`,
        complianceRequirements: tc.complianceRequirements || complianceFrameworks,
        generatedAt: new Date().toISOString(),
        methodology: methodology
      }));

      // Update summary
      testData.summary = {
        ...testData.summary,
        totalTests: testData.testCases.length,
        methodology: methodology,
        complianceFrameworks: complianceFrameworks,
        byPriority: this.countByField(testData.testCases, 'priority'),
        byCategory: this.countByField(testData.testCases, 'category'),
        byRiskLevel: this.countByField(testData.testCases, 'riskLevel')
      };

      console.log(`✅ [TestGenerator] Generated ${testData.testCases.length} test cases`);
      console.log(`🌍 [TestGenerator] Compliance coverage: ${complianceFrameworks.length} frameworks`);

      return testData;

    } catch (error) {
      console.error('❌ [TestGenerator] Test generation failed:', error);
      console.error('   Error message:', error.message);
      console.error('   Stack:', error.stack?.split('\n').slice(0, 3));
      throw error;
    }
  }

  /**
   * Helper: Count test cases by field
   */
  countByField(testCases, field) {
    const counts = {};
    testCases.forEach(tc => {
      const value = tc[field] || 'UNKNOWN';
      counts[value] = (counts[value] || 0) + 1;
    });
    return counts;
  }

  /**
   * Generate compliance coverage report
   */
  generateComplianceCoverageReport(testCases, complianceFrameworks) {
    const coverage = {};
    
    complianceFrameworks.forEach(framework => {
      const frameworkTests = testCases.filter(tc => 
        tc.complianceRequirements && 
        tc.complianceRequirements.some(req => 
          req.toLowerCase().includes(framework.toLowerCase().replace(/-/g, ' '))
        )
      );
      
      coverage[framework] = {
        testCaseCount: frameworkTests.length,
        percentage: testCases.length > 0 
          ? (frameworkTests.length / testCases.length * 100).toFixed(1)
          : 0,
        categories: [...new Set(frameworkTests.map(tc => tc.category))]
      };
    });

    return coverage;
  }
}

// Export singleton instance
const testCaseGeneratorMultiCompliance = new TestCaseGeneratorMultiCompliance();
export default testCaseGeneratorMultiCompliance;