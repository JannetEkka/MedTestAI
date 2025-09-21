import { GoogleGenerativeAI } from '@google/generative-ai';

class GeminiService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.models = [
      'gemini-2.0-flash-001',
      'gemini-1.5-flash', 
      'gemini-1.5-pro'
    ];
  }

  async generateContent(prompt) {
    for (let i = 0; i < this.models.length; i++) {
      try {
        console.log(`🤖 Trying model: ${this.models[i]}`);
        
        const model = this.genAI.getGenerativeModel({
          model: this.models[i],
          generationConfig: {
            temperature: 0.7,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 4096,
            responseMimeType: "application/json"
          }
        });

        const enhancedPrompt = `
You MUST respond with valid JSON only. No markdown, no explanations.

Generate healthcare test cases based on: ${prompt}

Response format:
{
  "testScenarios": [
    {
      "id": "TS001",
      "name": "Test Scenario Name",
      "description": "Description",
      "priority": "High",
      "category": "security"
    }
  ],
  "testCases": [
    {
      "testId": "TC001",
      "testName": "Test Case Name", 
      "description": "Description",
      "priority": "High",
      "category": "authentication",
      "testingTechnique": "boundary-value-analysis",
      "riskLevel": "High",
      "complianceRequirements": ["HIPAA Privacy Rule"],
      "automationPotential": "High",
      "preconditions": ["User logged in"],
      "testSteps": ["Step 1", "Step 2"],
      "expectedResults": ["Expected result"]
    }
  ]
}`;

        const result = await model.generateContent(enhancedPrompt);
        const response = await result.response;
        const text = response.text();
        
        console.log(`✅ Got response from ${this.models[i]}, length: ${text.length}`);
        
        // Try to parse JSON
        const parsed = this.parseJSON(text);
        if (parsed) {
          console.log(`✅ Successfully parsed JSON with ${this.models[i]}`);
          return JSON.stringify(parsed);
        }
        
      } catch (error) {
        console.error(`❌ Model ${this.models[i]} failed:`, error.message);
        if (i === this.models.length - 1) {
          console.log('🔄 All models failed, using mock response');
          return this.getMockResponse();
        }
      }
    }
  }

  parseJSON(text) {
    // Strategy 1: Direct parsing
    try {
      return JSON.parse(text.trim());
    } catch (e) {
      console.log('📝 Direct parse failed, trying extraction...');
    }

    // Strategy 2: Extract from code blocks
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1].trim());
      } catch (e) {
        console.log('📝 Code block extraction failed...');
      }
    }

    // Strategy 3: Find JSON object
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        let cleanJson = jsonMatch[0]
          .replace(/,(\s*[}\]])/g, '$1')  // Remove trailing commas
          .replace(/([{,]\s*)(\w+):/g, '$1"$2":')  // Quote keys
          .replace(/:\s*'([^']*?)'/g, ': "$1"');   // Replace single quotes
        
        return JSON.parse(cleanJson);
      } catch (e) {
        console.log('📝 JSON repair failed...');
      }
    }

    return null;
  }

  getMockResponse() {
    return JSON.stringify({
      testScenarios: [
        {
          id: "TS001",
          name: "Healthcare Authentication Security",
          description: "Comprehensive testing of healthcare provider authentication with HIPAA compliance",
          priority: "High",
          category: "security"
        },
        {
          id: "TS002", 
          name: "Patient Data Access Control",
          description: "Validate proper access controls for patient health information",
          priority: "High",
          category: "compliance"
        }
      ],
      testCases: [
        {
          testId: "TC001",
          testName: "Secure Healthcare Provider Login",
          description: "Verify healthcare provider can authenticate securely with MFA",
          priority: "High",
          category: "authentication",
          testingTechnique: "boundary-value-analysis",
          riskLevel: "High",
          complianceRequirements: ["HIPAA Security Rule", "Multi-Factor Authentication"],
          automationPotential: "High",
          preconditions: ["Valid provider credentials", "MFA device available"],
          testSteps: [
            "Enter valid username and password",
            "Complete MFA verification",
            "Verify successful login"
          ],
          expectedResults: [
            "User authenticated successfully",
            "Session established with proper timeout",
            "Login event logged for audit"
          ]
        },
        {
          testId: "TC002",
          testName: "Patient Record Access Authorization",
          description: "Ensure providers can only access authorized patient records",
          priority: "High",
          category: "authorization",
          testingTechnique: "equivalence-partitioning",
          riskLevel: "High",
          complianceRequirements: ["HIPAA Privacy Rule", "Minimum Necessary Standard"],
          automationPotential: "Medium",
          preconditions: ["Provider authenticated", "Patient records exist"],
          testSteps: [
            "Search for patient record",
            "Verify access permissions",
            "Display authorized data only"
          ],
          expectedResults: [
            "Only authorized records displayed",
            "Access attempt logged",
            "PHI protected according to role"
          ]
        }
      ]
    });
  }
}

export default GeminiService;