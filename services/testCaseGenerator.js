import HealthcareAIClients from '../auth/googleAuth.js';

class HealthcareTestCaseGenerator {
  constructor() {
    // Circuit breaker state
    this.failureCount = 0;
    this.failureThreshold = 3;
    this.circuitState = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.lastFailureTime = null;
    this.circuitTimeout = 60000; // 1 minute

    // Usage tracking
    this.requestCount = 0;
    this.tokenUsage = 0;
    this.lastResetTime = Date.now();

    // Model configuration with fallbacks
    this.modelConfig = {
      primary: 'gemini-1.5-pro',      // Your current model
      fallback: 'gemini-2.0-flash',   // Faster, cheaper fallback
      emergency: 'gemini-2.0-flash-lite' // Highest quota fallback
    };

    console.log('🔧 Healthcare Test Case Generator initialized with circuit breaker');
  }

  async generateTestCases(documentData, testType = 'functional') {
    // Force fallback mode if environment variable is set
    if (process.env.FORCE_FALLBACK_MODE === 'true') {
      console.log('🔄 Using fallback mode (forced by environment)');
      return this.generateFallbackResponse(documentData, testType);
    }
    // Check circuit breaker state
    if (!this.canMakeRequest()) {
      console.log('⚠️ Circuit breaker OPEN, using fallback response');
      return this.generateFallbackResponse(documentData, testType);
    }

    try {
      const result = await this.generateWithRetry(documentData, testType);
      this.recordSuccess();
      return result;
      
    } catch (error) {
      console.error('❌ Test case generation failed:', error);
      this.recordFailure();
      
      // Return fallback instead of throwing error
      if (this.isQuotaError(error)) {
        console.log('📊 Quota exceeded, returning structured fallback');
        return this.generateFallbackResponse(documentData, testType);
      }
      
      throw this.handleGeminiError(error);
    }
  }

  buildHealthcarePrompt(documentData, testType) {
    // Enhanced Healthcare Context
    const medicalTerms = ['PHI', 'HIPAA', 'EHR', 'HL7', 'FHIR', 'ICD-10', 'DICOM', 'SMART on FHIR'];
    const complianceFrameworks = ['HIPAA', 'FDA 21 CFR Part 820', 'NIST', 'ISO 13485'];
    const testingTechniques = ['Equivalence Partitioning', 'Boundary Value Analysis', 'Decision Tables'];
    
    const enhancedContext = `
Context: Healthcare software testing with medical terminology validation.
Medical Standards: ${medicalTerms.join(', ')}
Compliance Requirements: ${complianceFrameworks.join(', ')}
Testing Techniques: Apply ${testingTechniques.join(', ')} where appropriate.
Clinical Safety: Prioritize patient safety and data integrity in all test scenarios.
`;

    const requirementsText = documentData.requirements?.map(req => 
      `- ${req.category || 'Requirement'}: ${req.text || req.description || 'Not specified'}`
    ).join('\n') || 'No requirements found';

    const formFieldsText = documentData.formFields?.map(field => 
      `- ${field.name}: ${field.value}`
    ).join('\n') || 'No form fields found';

    return `${enhancedContext}

You are a healthcare QA specialist generating comprehensive test cases for medical software testing.

## Document Analysis
**Requirements extracted:**
${requirementsText}

**Form fields identified:**
${formFieldsText}

**Text content preview:**
${documentData.fullText?.substring(0, 500) || 'No additional content'}...

## Test Case Generation Instructions

Generate ${testType} test cases focusing on:

1. **Functional Testing**: Core healthcare workflows, data validation, clinical decision support
2. **Security Testing**: Patient data protection, access controls, audit trails  
3. **Compliance Testing**: HIPAA compliance, clinical guidelines adherence
4. **Integration Testing**: EHR integration, medical device connectivity
5. **Usability Testing**: Clinical user workflows, accessibility
6. **Performance Testing**: Response times for critical patient data

## Healthcare-Specific Testing Requirements

**Medical Data Validation:**
- Verify PHI encryption at rest and in transit
- Test medical terminology validation (ICD-10, SNOMED CT)
- Validate clinical decision support algorithms
- Ensure audit trail completeness for all PHI access

**Compliance Testing:**
- HIPAA Security Rule implementation
- HIPAA Privacy Rule adherence
- FDA 21 CFR Part 11 electronic records compliance
- Role-based access control (RBAC) validation

**Clinical Safety:**
- Patient identification verification
- Medication interaction checking
- Alert fatigue prevention
- Emergency access procedures

## Required JSON Output Format

{
  "testSuite": "Healthcare Test Suite",
  "summary": {
    "totalTestCases": number,
    "coverage": percentage,
    "complianceFramework": "HIPAA",
    "securityTestCases": number,
    "clinicalSafetyTests": number
  },
  "testCases": [
    {
      "testId": "TC001",
      "testName": "Descriptive test name",
      "category": "${testType}",
      "priority": "high|medium|low",
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
      "complianceRequirements": ["HIPAA rule", "Clinical standard"],
      "riskLevel": "high|medium|low",
      "automationPossible": true|false,
      "clinicalSafetyImpact": "Patient safety considerations",
      "testingTechnique": "Applied testing methodology"
    }
  ]
}

Generate 3-5 comprehensive test cases based on the healthcare requirements provided, ensuring all test cases include clinical safety considerations and compliance validation.`;
  }

  async generateWithRetry(documentData, testType, maxRetries = 3) {
    let lastError;
    
    // Try models in order: primary -> fallback -> emergency
    const modelsToTry = [
      this.modelConfig.primary,
      this.modelConfig.fallback, 
      this.modelConfig.emergency
    ];

    for (let modelAttempt = 0; modelAttempt < modelsToTry.length; modelAttempt++) {
      const modelName = modelsToTry[modelAttempt];
      
      for (let retry = 0; retry < maxRetries; retry++) {
        try {
          console.log(`🔬 Attempt ${retry + 1}/${maxRetries} with ${modelName}`);
          
          const gemini = await HealthcareAIClients.getGeminiClient();
          const model = gemini.getGenerativeModel({ model: modelName });
          
          const prompt = this.buildHealthcarePrompt(documentData, testType);
          
          const result = await model.generateContent({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.8,
              maxOutputTokens: modelName.includes('lite') ? 2048 : 4096,
            },
            safetySettings: [
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' }
            ]
          });

          const response = await result.response;
          const responseText = response.text();
          
          this.trackUsage(responseText.length / 4); // Rough token estimate
          
          return this.parseTestCaseResponse(responseText);
          
        } catch (error) {
          lastError = error;
          console.error(`❌ Attempt ${retry + 1} with ${modelName} failed:`, error.message);
          
          if (this.isQuotaError(error)) {
            console.log(`⏩ Quota error with ${modelName}, trying next model...`);
            break; // Try next model
          }
          
          if (retry === maxRetries - 1) {
            console.log(`🔄 All retries with ${modelName} failed, trying next model...`);
          } else {
            await new Promise(resolve => setTimeout(resolve, 1000 * (retry + 1))); // Exponential backoff
          }
        }
      }
    }
    
    throw lastError;
  }

  canMakeRequest() {
    if (this.circuitState === 'CLOSED') return true;
    
    if (this.circuitState === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.circuitTimeout) {
        this.circuitState = 'HALF_OPEN';
        console.log('🔄 Circuit breaker HALF_OPEN - attempting recovery');
        return true;
      }
      return false;
    }
    
    if (this.circuitState === 'HALF_OPEN') {
      return true; // Allow one request to test if service recovered
    }
    
    return false;
  }

  recordSuccess() {
    this.failureCount = 0;
    if (this.circuitState === 'HALF_OPEN') {
      this.circuitState = 'CLOSED';
      console.log('✅ Circuit breaker CLOSED - service recovered');
    }
  }

  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold && this.circuitState !== 'OPEN') {
      this.circuitState = 'OPEN';
      console.log('🚨 Circuit breaker OPEN');
    }
  }

  trackUsage(tokenCount) {
    this.requestCount++;
    this.tokenUsage += tokenCount;
    
    // Log usage every 10 requests
    if (this.requestCount % 10 === 0) {
      console.log(`📊 Usage: ${this.requestCount} requests, ~${this.tokenUsage} tokens this hour`);
    }
  }

  isQuotaError(error) {
    return error.status === 429 || 
           error.message?.toLowerCase().includes('quota') ||
           error.message?.toLowerCase().includes('rate limit') ||
           error.message?.toLowerCase().includes('too many requests');
  }

  generateFallbackResponse(documentData, testType) {
    const requirements = documentData.requirements || [];
    const requirementCount = requirements.length;
    
    console.log(`📄 Generating fallback response for ${requirementCount} requirements`);
    
    // Generate contextual test cases based on available data
    const testCases = requirements.slice(0, 3).map((req, index) => ({
      testId: `TC${String(index + 1).padStart(3, '0')}`,
      testName: `${testType.charAt(0).toUpperCase() + testType.slice(1)} Test - ${req.category || 'Requirement'} ${index + 1}`,
      category: testType,
      priority: index === 0 ? 'high' : 'medium',
      description: `Test case for: ${req.text?.substring(0, 100) || req.description?.substring(0, 100) || 'Healthcare requirement'}...`,
      preconditions: [
        "System is available and accessible",
        "User has appropriate permissions", 
        "Test data is prepared"
      ],
      testSteps: [
        {
          step: 1,
          action: "Navigate to relevant healthcare module",
          expectedResult: "Module loads successfully",
          testData: "Valid healthcare credentials"
        },
        {
          step: 2, 
          action: `Execute ${req.category || 'healthcare'} workflow`,
          expectedResult: "Workflow completes according to requirements",
          testData: "Standard test dataset"
        },
        {
          step: 3,
          action: "Verify compliance and data integrity",
          expectedResult: "All compliance rules satisfied",
          testData: "Validation checklist"
        }
      ],
      expectedResult: "Healthcare requirement is properly implemented and tested",
      complianceRequirements: ["HIPAA Security Rule", "HIPAA Privacy Rule", "Clinical Documentation"],
      riskLevel: index === 0 ? "high" : "medium",
      automationPossible: true,
      clinicalSafetyImpact: "Ensures patient data integrity and system reliability",
      testingTechnique: "Black-box testing with healthcare compliance validation",
      notes: "[FALLBACK] Generated during API quota limits - review and enhance manually"
    }));

    // If no requirements, provide generic healthcare test
    if (testCases.length === 0) {
      testCases.push({
        testId: "TC001",
        testName: "Healthcare System Basic Functionality Test",
        category: testType,
        priority: "high",
        description: "Basic functionality test for healthcare system components",
        preconditions: ["System accessible", "Test environment prepared"],
        testSteps: [
          {
            step: 1,
            action: "Verify system login and authentication",
            expectedResult: "User successfully authenticates",
            testData: "Valid test credentials"
          },
          {
            step: 2,
            action: "Test core healthcare workflows",
            expectedResult: "Workflows execute without errors",
            testData: "Sample healthcare data"
          }
        ],
        expectedResult: "Core healthcare functionality works as expected",
        complianceRequirements: ["HIPAA Compliance", "Healthcare Standards"],
        riskLevel: "medium",
        automationPossible: true,
        clinicalSafetyImpact: "Validates core system functionality for patient care",
        testingTechnique: "Functional testing with compliance verification",
        notes: "[FALLBACK] Generic test case - customize based on specific requirements"
      });
    }

    return {
      testSuite: "Healthcare Test Suite (Fallback Mode)",
      summary: {
        totalTestCases: testCases.length,
        coverage: Math.min(85, requirementCount * 20), // Reasonable coverage estimate
        complianceFramework: "HIPAA",
        securityTestCases: Math.floor(testCases.length * 0.4),
        clinicalSafetyTests: Math.floor(testCases.length * 0.3),
        generationMode: "fallback",
        notice: "Generated during API quota limits - manual review recommended"
      },
      testCases: testCases,
      metadata: {
        generatedAt: new Date().toISOString(),
        fallbackReason: "API quota exceeded",
        requirementsProcessed: requirementCount,
        circuitBreakerState: this.circuitState
      }
    };
  }

  parseTestCaseResponse(responseText) {
    try {
      // Try to extract JSON from response
      const jsonMatch = responseText.match(/```json\s*\n([\s\S]*?)\n\s*```/) || 
                       responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        return JSON.parse(jsonStr);
      }

      // Fallback: try to parse entire response as JSON
      return JSON.parse(responseText);
    } catch (error) {
      console.error('⚠️ Failed to parse test case response:', error);
      
      // Return structured fallback with partial content
      return {
        testSuite: "Healthcare Test Suite",
        summary: {
          totalTestCases: 1,
          coverage: 75,
          complianceFramework: "HIPAA",
          securityTestCases: 1,
          clinicalSafetyTests: 1,
          parseWarning: "Response required manual structuring"
        },
        testCases: [{
          testId: "TC001",
          testName: "AI Generated Healthcare Test Case",
          category: "functional",
          priority: "medium",
          description: "Test case generated from AI response",
          preconditions: ["System available", "User authenticated"],
          testSteps: [{
            step: 1,
            action: "Execute healthcare workflow test scenario",
            expectedResult: "System responds appropriately",
            testData: "Standard healthcare test data"
          }],
          expectedResult: "Healthcare requirements validated",
          complianceRequirements: ["HIPAA Security Rule", "HIPAA Privacy Rule"],
          riskLevel: "medium",
          automationPossible: true,
          clinicalSafetyImpact: "Validates system safety for patient care",
          testingTechnique: "Functional validation with compliance checks",
          notes: "Generated from unparseable AI response - review required",
          rawResponse: responseText.substring(0, 500) + "..."
        }]
      };
    }
  }

  handleGeminiError(error) {
    if (error.status === 429) {
      return new Error('AI service rate limit exceeded - using fallback responses');
    }
    if (error.status === 401) {
      return new Error('AI service authentication failed - check API key configuration');
    }
    if (this.isQuotaError(error)) {
      return new Error('AI service quota exceeded - fallback mode activated');
    }
    return new Error(`AI test case generation failed: ${error.message}`);
  }

  // Public method to check system status
  getSystemStatus() {
    return {
      circuitBreakerState: this.circuitState,
      failureCount: this.failureCount,
      requestCount: this.requestCount,
      tokenUsage: this.tokenUsage,
      lastFailureTime: this.lastFailureTime,
      modelsAvailable: this.modelConfig
    };
  }
}

export default new HealthcareTestCaseGenerator();