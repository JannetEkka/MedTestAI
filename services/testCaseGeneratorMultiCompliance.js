// services/testCaseGeneratorMultiCompliance.js
import { VertexAI } from '@google-cloud/vertexai';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Enhanced Test Case Generator with Multi-Compliance Support
 * 
 * Generates healthcare test cases that satisfy multiple compliance standards
 * simultaneously (HIPAA + FDA + GDPR + ISO + etc.)
 */

class TestCaseGeneratorMultiCompliance {
  constructor() {
    this.vertexAI = null;
    this.model = null;
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT || 'pro-variety-472211-b9';
    this.location = 'us-central1';
    this.modelName = 'gemini-1.5-flash-002';
  }

  async initialize() {
    try {
      console.log('🤖 [TestGenerator] Initializing Vertex AI...');
      
      this.vertexAI = new VertexAI({
        project: this.projectId,
        location: this.location
      });

      this.model = this.vertexAI.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.7,
          topP: 0.95,
        }
      });

      console.log('✅ [TestGenerator] Multi-compliance test generator initialized');
    } catch (error) {
      console.error('❌ [TestGenerator] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Generate compliance-specific requirements based on selected frameworks
   */
  getComplianceRequirements(complianceFrameworks) {
    const allRequirements = {
      'hipaa': {
        name: 'HIPAA',
        requirements: [
          'Verify access control and unique user identification',
          'Test emergency access procedures',
          'Validate automatic logoff after inactivity',
          'Verify encryption of PHI at rest and in transit',
          'Test audit trail for all PHI access',
          'Validate de-identification procedures',
          'Test data backup and disaster recovery',
          'Verify integrity controls for PHI'
        ]
      },
      'fda-21-cfr-11': {
        name: 'FDA 21 CFR Part 11',
        requirements: [
          'Validate electronic signatures',
          'Test audit trail completeness and integrity',
          'Verify system validation documentation',
          'Test record retention and retrieval',
          'Validate timestamping accuracy',
          'Test change control procedures',
          'Verify user authentication mechanisms',
          'Test data integrity controls'
        ]
      },
      'gdpr': {
        name: 'GDPR',
        requirements: [
          'Test right to access (data portability)',
          'Verify right to erasure (right to be forgotten)',
          'Validate consent management',
          'Test data breach notification within 72 hours',
          'Verify privacy by design implementation',
          'Test data minimization principles',
          'Validate data processing agreements',
          'Test cross-border data transfer controls'
        ]
      },
      'hitrust': {
        name: 'HITRUST CSF',
        requirements: [
          'Test risk assessment procedures',
          'Validate information protection program',
          'Verify access control management',
          'Test incident management response',
          'Validate business continuity planning',
          'Test third-party risk management',
          'Verify security monitoring and logging',
          'Test vulnerability management'
        ]
      },
      'soc2': {
        name: 'SOC 2',
        requirements: [
          'Test security controls and monitoring',
          'Verify system availability metrics',
          'Validate processing integrity',
          'Test confidentiality controls',
          'Verify privacy safeguards',
          'Test change management procedures',
          'Validate logical access controls',
          'Test system operations monitoring'
        ]
      },
      'iso-13485': {
        name: 'ISO 13485',
        requirements: [
          'Test design and development controls',
          'Validate risk management processes',
          'Verify software validation requirements',
          'Test document control procedures',
          'Validate traceability requirements',
          'Test complaint handling procedures',
          'Verify post-market surveillance',
          'Test corrective and preventive actions'
        ]
      },
      'iso-27001': {
        name: 'ISO 27001',
        requirements: [
          'Test information security policies',
          'Validate asset management',
          'Verify access control mechanisms',
          'Test cryptographic controls',
          'Validate physical security',
          'Test security incident management',
          'Verify business continuity',
          'Test supplier security'
        ]
      },
      'abdm': {
        name: 'ABDM (India)',
        requirements: [
          'Test Health ID integration',
          'Validate healthcare professional registry',
          'Verify health facility registry',
          'Test EHR standards compliance',
          'Validate consent management framework',
          'Test interoperability standards',
          'Verify ABDM API integration',
          'Test PHR (Personal Health Record) linking'
        ]
      }
    };

    const selectedRequirements = [];
    complianceFrameworks.forEach(framework => {
      if (allRequirements[framework]) {
        selectedRequirements.push({
          framework: allRequirements[framework].name,
          requirements: allRequirements[framework].requirements
        });
      }
    });

    return selectedRequirements;
  }

  /**
   * Build comprehensive prompt for multi-compliance test generation
   */
  buildPrompt(requirements, methodology, complianceFrameworks) {
    const complianceReqs = this.getComplianceRequirements(complianceFrameworks);
    
    const complianceSection = complianceReqs.map(comp => 
      `\n**${comp.framework} Requirements:**\n${comp.requirements.map((r, i) => `${i + 1}. ${r}`).join('\n')}`
    ).join('\n\n');

    const prompt = `You are an expert healthcare software testing specialist with deep knowledge of multiple international compliance frameworks.

**Task:** Generate comprehensive test cases for the following healthcare requirements that satisfy ALL selected compliance frameworks simultaneously.

**Requirements to Test:**
${requirements}

**Testing Methodology:** ${methodology.toUpperCase()}

**Compliance Frameworks to Satisfy:**
${complianceFrameworks.map(f => `- ${this.getComplianceRequirements([f])[0]?.framework || f.toUpperCase()}`).join('\n')}

${complianceSection}

**CRITICAL INSTRUCTIONS:**

1. **Multi-Compliance Approach:**
   - Each test case MUST address requirements from ALL selected compliance frameworks
   - Identify overlapping requirements and create consolidated test cases where possible
   - Add specific validation steps for each framework's unique requirements
   - Tag each test case with all applicable compliance frameworks

2. **Test Case Structure:**
   For ${methodology} methodology, generate test cases with:
   - testId: Unique identifier (e.g., TC_001)
   - testName: Clear, descriptive name
   - category: Type of testing (Functional, Security, Compliance, etc.)
   - priority: High/Medium/Low based on patient safety and regulatory risk
   - description: What is being tested
   - preconditions: Setup required before testing
   - testSteps: Detailed, numbered steps to execute
   - expectedResults: What should happen at each step
   - complianceRequirements: Array of ALL compliance frameworks this test satisfies
   - riskLevel: Critical/High/Medium/Low
   - testingTechnique: Equivalence Partitioning, Boundary Value Analysis, etc.
   - automationPotential: High/Medium/Low

3. **Healthcare-Specific Considerations:**
   - Patient safety is ALWAYS the highest priority
   - Consider PHI (Protected Health Information) in ALL test scenarios
   - Include edge cases for medical data (vital signs, medications, allergies)
   - Test emergency access procedures where applicable
   - Consider different user roles (doctors, nurses, admins, patients)

4. **Compliance Integration:**
   - For HIPAA: Focus on PHI protection, access controls, audit trails
   - For FDA 21 CFR Part 11: Electronic signatures, validation, change control
   - For GDPR: Consent, right to erasure, data portability, breach notification
   - For HITRUST: Risk management, third-party assurance
   - For SOC 2: Security controls, availability, processing integrity
   - For ISO 13485: Risk management, design controls, traceability
   - For ISO 27001: Information security management
   - For ABDM: Health ID, interoperability, consent framework

5. **Output Format:**
   Return ONLY a valid JSON object with this structure:
   {
     "summary": {
       "totalTestCases": <number>,
       "methodology": "${methodology}",
       "complianceFrameworks": ${JSON.stringify(complianceFrameworks)},
       "coverageAnalysis": {
         "functional": <percentage>,
         "security": <percentage>,
         "compliance": <percentage>,
         "performance": <percentage>
       }
     },
     "testCases": [
       {
         "testId": "TC_001",
         "testName": "...",
         "category": "...",
         "priority": "High",
         "description": "...",
         "preconditions": ["..."],
         "testSteps": [
           {"step": 1, "action": "...", "expectedResult": "..."}
         ],
         "expectedResults": ["..."],
         "complianceRequirements": ["HIPAA", "GDPR", "..."],
         "riskLevel": "Critical",
         "testingTechnique": "...",
         "automationPotential": "High"
       }
     ]
   }

Generate 15-25 high-quality test cases that comprehensively cover the requirements and ALL selected compliance frameworks.`;

    return prompt;
  }

  /**
   * Generate test cases with multi-compliance support
   */
  async generateTestCases(requirements, methodology = 'agile', complianceFrameworks = ['hipaa']) {
    try {
      console.log(`\n🧪 [TestGenerator] Starting multi-compliance test generation...`);
      console.log(`📋 [TestGenerator] Requirements length: ${requirements.length} chars`);
      console.log(`🔧 [TestGenerator] Methodology: ${methodology}`);
      console.log(`🌐 [TestGenerator] Compliance frameworks: ${complianceFrameworks.join(', ')}`);

      if (!this.model) {
        await this.initialize();
      }

      // Build prompt
      const prompt = this.buildPrompt(requirements, methodology, complianceFrameworks);
      
      console.log(`🤖 [TestGenerator] Sending request to Gemini...`);
      
      // Generate content
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.candidates[0].content.parts[0].text;

      console.log(`✅ [TestGenerator] Received response from Gemini`);
      console.log(`📝 [TestGenerator] Response length: ${text.length} chars`);

      // Parse JSON response
      let testCases;
      try {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        const jsonText = jsonMatch ? jsonMatch[1] : text;
        testCases = JSON.parse(jsonText);
      } catch (parseError) {
        console.error('❌ [TestGenerator] JSON parse error:', parseError);
        throw new Error('Failed to parse AI response as JSON');
      }

      // Validate and enhance test cases
      if (!testCases.testCases || !Array.isArray(testCases.testCases)) {
        throw new Error('Invalid test case format');
      }

      // Ensure all test cases have compliance tags
      testCases.testCases = testCases.testCases.map(tc => ({
        ...tc,
        complianceRequirements: tc.complianceRequirements || complianceFrameworks.map(f => 
          f.toUpperCase().replace(/-/g, ' ')
        ),
        generatedAt: new Date().toISOString(),
        methodology: methodology
      }));

      console.log(`✅ [TestGenerator] Generated ${testCases.testCases.length} test cases`);
      console.log(`🌐 [TestGenerator] Compliance coverage: ${complianceFrameworks.length} frameworks`);

      return testCases;

    } catch (error) {
      console.error('❌ [TestGenerator] Test generation failed:', error);
      throw error;
    }
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
          req.toLowerCase().includes(framework.replace(/-/g, ' '))
        )
      );
      
      coverage[framework] = {
        testCaseCount: frameworkTests.length,
        percentage: (frameworkTests.length / testCases.length * 100).toFixed(1),
        categories: [...new Set(frameworkTests.map(tc => tc.category))]
      };
    });

    return coverage;
  }
}

// Export singleton instance
const testCaseGeneratorMultiCompliance = new TestCaseGeneratorMultiCompliance();
export default testCaseGeneratorMultiCompliance;