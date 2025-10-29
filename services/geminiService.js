// src/services/ai/geminiService.js
import { GoogleGenerativeAI } from '@google/generative-ai';

class GeminiService {
  constructor() {
    this.genAI = process.env.GEMINI_API_KEY 
      ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
      : null;
    this.model = null;
  }

  initialize() {
    if (!this.genAI) {
      console.warn('⚠️ Gemini API key not configured');
      return false;
    }
    
    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
        responseMimeType: "application/json"
      }
    });
    
    console.log('✅ Gemini AI service initialized');
    return true;
  }

  async generateTestCases(requirements, methodology = 'agile', compliance = 'HIPAA') {
    if (!this.model) {
      throw new Error('Gemini model not initialized');
    }

    const prompt = `
    Generate comprehensive healthcare software test cases based on these requirements.
    
    Requirements: ${JSON.stringify(requirements)}
    Methodology: ${methodology}
    Compliance Framework: ${compliance}
    
    Return a JSON object with this exact structure:
    {
      "testCases": [
        {
          "testId": "TC001",
          "testName": "string",
          "description": "string",
          "priority": "High|Medium|Low",
          "category": "functional|security|performance|usability",
          "testingTechnique": "boundary-value|equivalence-partitioning|decision-table",
          "riskLevel": "High|Medium|Low",
          "complianceRequirements": ["array of requirements"],
          "automationPotential": "High|Medium|Low",
          "preconditions": ["array of preconditions"],
          "testSteps": ["array of steps"],
          "expectedResults": ["array of expected results"],
          "actualResults": "",
          "status": "Not Started",
          "requirementId": "string"
        }
      ],
      "summary": {
        "totalTestCases": number,
        "coverage": number,
        "highPriorityCount": number,
        "complianceFramework": "${compliance}",
        "categoriesCount": {
          "functional": number,
          "security": number,
          "performance": number,
          "usability": number
        }
      }
    }`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse and validate JSON response
      const testData = JSON.parse(text);
      
      // Add metadata
      testData.generatedAt = new Date().toISOString();
      testData.methodology = methodology;
      testData.aiModel = 'gemini-1.5-flash';
      
      return testData;
    } catch (error) {
      console.error('Test generation error:', error);
      throw new Error(`Failed to generate test cases: ${error.message}`);
    }
  }

  async analyzeRequirements(text) {
    if (!this.model) {
      throw new Error('Gemini model not initialized');
    }

    const prompt = `
    Analyze this healthcare software requirement document and extract structured requirements.
    
    Document: ${text}
    
    Return JSON with:
    {
      "requirements": [
        {
          "id": "REQ001",
          "text": "requirement text",
          "category": "functional|non-functional|security|compliance",
          "priority": "critical|high|medium|low",
          "testable": true|false,
          "acceptanceCriteria": ["array of criteria"],
          "dependencies": ["array of requirement IDs"],
          "complianceMapping": ["HIPAA sections or other compliance requirements"]
        }
      ],
      "documentSummary": {
        "totalRequirements": number,
        "categories": {
          "functional": number,
          "nonFunctional": number,
          "security": number,
          "compliance": number
        },
        "testabilityScore": number (0-100),
        "complianceFrameworks": ["detected frameworks"]
      }
    }`;

    const result = await this.model.generateContent(prompt);
    return JSON.parse(result.response.text());
  }
}

// src/services/healthcare/documentAIService.js
import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import { Storage } from '@google-cloud/storage';

class DocumentAIService {
  constructor() {
    this.client = null;
    this.storage = null;
    this.processorPath = null;
  }

  async initialize() {
    try {
      this.client = new DocumentProcessorServiceClient({
        apiEndpoint: 'us-documentai.googleapis.com'
      });
      
      this.storage = new Storage({
        projectId: process.env.GOOGLE_CLOUD_PROJECT
      });

      // Healthcare Document Form Parser
      this.processorPath = `projects/${process.env.GOOGLE_CLOUD_PROJECT}/locations/us/processors/${process.env.DOCUMENT_AI_PROCESSOR_ID}`;
      
      console.log('✅ Document AI service initialized');
      return true;
    } catch (error) {
      console.error('❌ Document AI initialization failed:', error);
      return false;
    }
  }

  async processHealthcareDocument(filePath, mimeType) {
    if (!this.client) {
      throw new Error('Document AI client not initialized');
    }

    const fs = require('fs').promises;
    const fileContent = await fs.readFile(filePath);
    
    const request = {
      name: this.processorPath,
      rawDocument: {
        content: fileContent.toString('base64'),
        mimeType: mimeType
      },
      processOptions: {
        fromStart: true,
        ocr: {
          enableNativePdfParsing: true,
          enableImageQualityScores: true,
          enableSymbolRecognition: true
        }
      }
    };

    try {
      const [result] = await this.client.processDocument(request);
      
      return {
        text: result.document.text,
        entities: this.extractHealthcareEntities(result.document),
        formFields: this.extractFormFields(result.document),
        tables: this.extractTables(result.document),
        confidence: result.document.confidence || 0,
        pages: result.document.pages?.length || 0
      };
    } catch (error) {
      console.error('Document processing error:', error);
      throw error;
    }
  }

  extractHealthcareEntities(document) {
    const entities = [];
    
    if (document.entities) {
      for (const entity of document.entities) {
        // Healthcare-specific entity types
        const healthcareTypes = [
          'patient_name', 'dob', 'mrn', 'diagnosis', 
          'medication', 'procedure', 'provider', 
          'insurance', 'allergies', 'vitals'
        ];
        
        if (healthcareTypes.includes(entity.type) || entity.type.includes('medical')) {
          entities.push({
            type: entity.type,
            text: entity.textAnchor?.content || entity.mentionText,
            confidence: entity.confidence,
            properties: entity.properties || [],
            redacted: this.shouldRedactPHI(entity.type)
          });
        }
      }
    }
    
    return entities;
  }

  extractFormFields(document) {
    const fields = [];
    
    if (document.pages) {
      for (const page of document.pages) {
        if (page.formFields) {
          for (const field of page.formFields) {
            fields.push({
              name: field.fieldName?.textAnchor?.content || '',
              value: field.fieldValue?.textAnchor?.content || '',
              confidence: field.confidence || 0,
              type: field.valueType || 'text'
            });
          }
        }
      }
    }
    
    return fields;
  }

  extractTables(document) {
    const tables = [];
    
    if (document.pages) {
      for (const page of document.pages) {
        if (page.tables) {
          for (const table of page.tables) {
            const extractedTable = {
              rows: [],
              headers: []
            };
            
            if (table.headerRows) {
              extractedTable.headers = table.headerRows.map(row =>
                row.cells.map(cell => cell.textAnchor?.content || '')
              );
            }
            
            if (table.bodyRows) {
              extractedTable.rows = table.bodyRows.map(row =>
                row.cells.map(cell => cell.textAnchor?.content || '')
              );
            }
            
            tables.push(extractedTable);
          }
        }
      }
    }
    
    return tables;
  }

  shouldRedactPHI(entityType) {
    const phiTypes = [
      'patient_name', 'ssn', 'mrn', 'dob', 
      'address', 'phone', 'email', 'insurance_id'
    ];
    return phiTypes.includes(entityType.toLowerCase());
  }
}

// src/services/healthcare/complianceEngine.js
class ComplianceEngine {
  constructor() {
    this.frameworks = {
      HIPAA: {
        privacy: [
          'Minimum necessary standard',
          'Patient consent requirements',
          'De-identification standards',
          'Breach notification requirements'
        ],
        security: [
          'Access controls',
          'Audit logging',
          'Encryption requirements',
          'Transmission security'
        ]
      },
      FDA: {
        '21_CFR_Part_11': [
          'Electronic signatures',
          'Audit trails',
          'System validation',
          'Record retention'
        ]
      },
      GDPR: {
        rights: [
          'Right to access',
          'Right to rectification',
          'Right to erasure',
          'Data portability'
        ]
      }
    };
  }

  applyComplianceRules(testCases, framework = 'HIPAA') {
    const rules = this.frameworks[framework];
    if (!rules) {
      console.warn(`Unknown compliance framework: ${framework}`);
      return testCases;
    }

    // Add compliance-specific test cases
    const complianceTests = [];
    
    // Add security test cases
    if (rules.security) {
      rules.security.forEach((rule, index) => {
        complianceTests.push({
          testId: `CT-SEC-${String(index + 1).padStart(3, '0')}`,
          testName: `Compliance Test: ${rule}`,
          description: `Verify system compliance with ${framework} ${rule}`,
          priority: 'High',
          category: 'compliance',
          testingTechnique: 'compliance-validation',
          riskLevel: 'High',
          complianceRequirements: [`${framework} - ${rule}`],
          automationPotential: 'Medium',
          preconditions: ['System configured for ' + framework],
          testSteps: this.generateComplianceTestSteps(rule, framework),
          expectedResults: [`System complies with ${framework} ${rule}`],
          requirementId: 'COMPLIANCE-' + framework
        });
      });
    }

    // Add privacy test cases
    if (rules.privacy) {
      rules.privacy.forEach((rule, index) => {
        complianceTests.push({
          testId: `CT-PRIV-${String(index + 1).padStart(3, '0')}`,
          testName: `Privacy Test: ${rule}`,
          description: `Verify privacy compliance with ${framework} ${rule}`,
          priority: 'High',
          category: 'privacy',
          testingTechnique: 'privacy-validation',
          riskLevel: 'High',
          complianceRequirements: [`${framework} - ${rule}`],
          automationPotential: 'Low',
          preconditions: ['PHI data available for testing'],
          testSteps: this.generatePrivacyTestSteps(rule, framework),
          expectedResults: [`Privacy protected per ${framework} ${rule}`],
          requirementId: 'PRIVACY-' + framework
        });
      });
    }

    // Merge with existing test cases
    return {
      ...testCases,
      testCases: [...(testCases.testCases || []), ...complianceTests],
      complianceValidation: {
        framework,
        rulesApplied: Object.keys(rules).flatMap(key => rules[key]),
        additionalTestsAdded: complianceTests.length,
        validatedAt: new Date().toISOString()
      }
    };
  }

  generateComplianceTestSteps(rule, framework) {
    const steps = {
      'Access controls': [
        'Attempt unauthorized access to PHI',
        'Verify access is denied',
        'Login with authorized credentials',
        'Verify access is granted with appropriate permissions',
        'Check audit log for access attempts'
      ],
      'Audit logging': [
        'Perform various system actions',
        'Access audit log interface',
        'Verify all actions are logged',
        'Check log integrity and immutability',
        'Verify log retention meets requirements'
      ],
      'Encryption requirements': [
        'Inspect data at rest encryption',
        'Verify encryption algorithms meet standards',
        'Test data transmission security',
        'Validate key management procedures',
        'Check encryption for backups'
      ]
    };
    
    return steps[rule] || ['Verify ' + rule + ' implementation'];
  }

  generatePrivacyTestSteps(rule, framework) {
    const steps = {
      'Minimum necessary standard': [
        'Access PHI with different user roles',
        'Verify each role sees only necessary data',
        'Test data filtering mechanisms',
        'Validate role-based access controls',
        'Document data exposure per role'
      ],
      'Patient consent requirements': [
        'Access consent management interface',
        'Test consent capture workflow',
        'Verify consent validation before data access',
        'Test consent withdrawal process',
        'Validate consent audit trail'
      ]
    };
    
    return steps[rule] || ['Verify ' + rule + ' compliance'];
  }

  validateTestCoverage(testCases, requirements) {
    const coverage = {
      totalRequirements: requirements.length,
      coveredRequirements: 0,
      uncoveredRequirements: [],
      coveragePercentage: 0,
      complianceGaps: []
    };

    const coveredReqs = new Set();
    
    testCases.forEach(test => {
      if (test.requirementId) {
        coveredReqs.add(test.requirementId);
      }
    });

    coverage.coveredRequirements = coveredReqs.size;
    coverage.coveragePercentage = Math.round(
      (coverage.coveredRequirements / coverage.totalRequirements) * 100
    );

    requirements.forEach(req => {
      if (!coveredReqs.has(req.id)) {
        coverage.uncoveredRequirements.push(req.id);
        
        if (req.category === 'compliance' || req.category === 'security') {
          coverage.complianceGaps.push({
            requirementId: req.id,
            description: req.text,
            risk: 'High'
          });
        }
      }
    });

    return coverage;
  }
}

// Export all services
export { GeminiService, DocumentAIService, ComplianceEngine };