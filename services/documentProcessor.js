import fs from 'fs/promises';
import path from 'path';
import HealthcareAIClients from '../auth/googleAuth.js';

class HealthcareDocumentProcessor {
  async processDocument(filePath, mimeType) {
    console.log('📄 Processing healthcare document...');
    
    // Handle text files directly (skip Document AI)
    if (mimeType === 'text/plain') {
      console.log('📝 Processing text file directly...');
      try {
        const textContent = await fs.readFile(filePath, 'utf8');
        
        return {
          extractedRequirements: this.extractRequirementsFromText(textContent),
          documentSummary: 'Text-based requirements document',
          confidence: 0.90,
          fullText: textContent,
          requirements: this.extractRequirementsFromText(textContent),
          userStories: this.processUserStories(textContent), // NEW: User story processing
          entities: [],
          formFields: [],
          tables: []
        };
      } catch (error) {
        throw new Error(`Failed to read text file: ${error.message}`);
      }
    }

    // Process PDFs and images with Document AI
    try {
      const documentAI = await HealthcareAIClients.getDocumentAIClient();
      
      // Read document
      const documentContent = await fs.readFile(filePath);
      const encodedDocument = Buffer.from(documentContent).toString('base64');

      // Configure processing request
      const processorName = `projects/${process.env.GOOGLE_CLOUD_PROJECT}/locations/${process.env.DOCUMENT_AI_LOCATION}/processors/${process.env.DOCUMENT_AI_PROCESSOR_ID}`;
      
      const request = {
        name: processorName,
        rawDocument: {
          content: encodedDocument,
          mimeType: mimeType
        }
      };

      // Process document
      const [result] = await documentAI.processDocument(request);
      const extractedData = this.extractHealthcareData(result.document);
      
      // Add user story processing for text content
      if (extractedData.fullText) {
        extractedData.userStories = this.processUserStories(extractedData.fullText);
      }
      
      return extractedData;
      
    } catch (error) {
      console.error('❌ Document processing failed:', error);
      throw this.handleDocumentError(error);
    }
  }

  // NEW: User story processing method
  processUserStories(documentData) {
    const fullText = typeof documentData === 'string' ? documentData : documentData.fullText || '';
    const userStoryPattern = /As a (.+?), I want (.+?) so that (.+?)[\.\n]/gi;
    const userStories = [];
    let match;
    
    while ((match = userStoryPattern.exec(fullText)) !== null) {
      const userStory = {
        id: `US${String(userStories.length + 1).padStart(3, '0')}`,
        role: match[1].trim(),
        goal: match[2].trim(),
        benefit: match[3].trim(),
        acceptanceCriteria: [], // To be populated based on surrounding context
        testScenarios: [], // To be generated
        healthcareContext: this.extractHealthcareContext(match[1].trim()),
        complianceImpact: this.assessComplianceImpact(match[2].trim()),
        clinicalSafety: this.assessClinicalSafety(match[2].trim(), match[3].trim())
      };
      
      // Extract acceptance criteria from surrounding text
      userStory.acceptanceCriteria = this.extractAcceptanceCriteria(fullText, match.index);
      
      userStories.push(userStory);
    }
    
    // Also look for alternative user story formats
    const alternativePatterns = [
      /As (.+?), I need (.+?) to (.+?)[\.\n]/gi,
      /User story: (.+?) wants (.+?) because (.+?)[\.\n]/gi,
      /Story: (.+?) - (.+?) - (.+?)[\.\n]/gi
    ];
    
    alternativePatterns.forEach(pattern => {
      let altMatch;
      while ((altMatch = pattern.exec(fullText)) !== null) {
        // Avoid duplicates by checking if this story already exists
        const isDuplicate = userStories.some(story => 
          story.role.toLowerCase().includes(altMatch[1].toLowerCase()) ||
          story.goal.toLowerCase().includes(altMatch[2].toLowerCase())
        );
        
        if (!isDuplicate) {
          userStories.push({
            id: `US${String(userStories.length + 1).padStart(3, '0')}`,
            role: altMatch[1].trim(),
            goal: altMatch[2].trim(),
            benefit: altMatch[3].trim(),
            acceptanceCriteria: this.extractAcceptanceCriteria(fullText, altMatch.index),
            testScenarios: [],
            healthcareContext: this.extractHealthcareContext(altMatch[1].trim()),
            complianceImpact: this.assessComplianceImpact(altMatch[2].trim()),
            clinicalSafety: this.assessClinicalSafety(altMatch[2].trim(), altMatch[3].trim())
          });
        }
      }
    });
    
    console.log(`📋 Extracted ${userStories.length} user stories`);
    return userStories;
  }

  // NEW: Extract healthcare context from user role
  extractHealthcareContext(role) {
    const roleType = role.toLowerCase();
    
    if (roleType.includes('doctor') || roleType.includes('physician') || roleType.includes('clinician')) {
      return {
        userType: 'clinical_practitioner',
        permissions: ['patient_data_access', 'clinical_documentation', 'prescription_writing'],
        workflowType: 'clinical_decision_making',
        safetyLevel: 'high'
      };
    } else if (roleType.includes('nurse') || roleType.includes('nursing')) {
      return {
        userType: 'nursing_staff',
        permissions: ['patient_care_access', 'medication_administration', 'vital_signs'],
        workflowType: 'patient_care',
        safetyLevel: 'high'
      };
    } else if (roleType.includes('admin') || roleType.includes('administrator')) {
      return {
        userType: 'administrative_staff',
        permissions: ['system_configuration', 'user_management', 'audit_access'],
        workflowType: 'system_administration',
        safetyLevel: 'medium'
      };
    } else if (roleType.includes('patient')) {
      return {
        userType: 'patient',
        permissions: ['personal_data_access', 'appointment_scheduling', 'test_results_viewing'],
        workflowType: 'patient_portal',
        safetyLevel: 'medium'
      };
    } else if (roleType.includes('pharmacist')) {
      return {
        userType: 'pharmacy_staff',
        permissions: ['prescription_access', 'drug_interaction_checking', 'dispensing_records'],
        workflowType: 'medication_management',
        safetyLevel: 'high'
      };
    } else {
      return {
        userType: 'general_healthcare_user',
        permissions: ['basic_system_access'],
        workflowType: 'general',
        safetyLevel: 'medium'
      };
    }
  }

  // NEW: Assess compliance impact of user goals
  assessComplianceImpact(goal) {
    const goalText = goal.toLowerCase();
    const complianceAreas = [];
    
    if (goalText.includes('patient data') || goalText.includes('medical record') || goalText.includes('phi')) {
      complianceAreas.push('HIPAA_Privacy_Rule');
    }
    
    if (goalText.includes('access') || goalText.includes('login') || goalText.includes('authentication')) {
      complianceAreas.push('HIPAA_Security_Rule');
    }
    
    if (goalText.includes('audit') || goalText.includes('log') || goalText.includes('track')) {
      complianceAreas.push('HIPAA_Administrative_Safeguards');
    }
    
    if (goalText.includes('encrypt') || goalText.includes('secure') || goalText.includes('protection')) {
      complianceAreas.push('HIPAA_Security_Rule');
    }
    
    if (goalText.includes('medication') || goalText.includes('prescription') || goalText.includes('drug')) {
      complianceAreas.push('FDA_21_CFR_Part_11');
    }
    
    if (goalText.includes('device') || goalText.includes('medical equipment')) {
      complianceAreas.push('FDA_510k_Requirements');
    }
    
    return {
      areas: complianceAreas,
      riskLevel: complianceAreas.length > 2 ? 'high' : complianceAreas.length > 0 ? 'medium' : 'low',
      requiresValidation: complianceAreas.length > 0
    };
  }

  // NEW: Assess clinical safety impact
  assessClinicalSafety(goal, benefit) {
    const combinedText = (goal + ' ' + benefit).toLowerCase();
    
    const criticalSafetyKeywords = [
      'patient safety', 'life threatening', 'emergency', 'critical care',
      'medication dosage', 'allergic reaction', 'vital signs', 'cardiac',
      'blood pressure', 'oxygen', 'anesthesia', 'surgery'
    ];
    
    const moderateSafetyKeywords = [
      'patient care', 'treatment plan', 'diagnosis', 'medical history',
      'lab results', 'imaging', 'referral', 'discharge'
    ];
    
    const hasCriticalKeywords = criticalSafetyKeywords.some(keyword => 
      combinedText.includes(keyword)
    );
    
    const hasModeratekeywords = moderateSafetyKeywords.some(keyword => 
      combinedText.includes(keyword)
    );
    
    if (hasCriticalKeywords) {
      return {
        level: 'critical',
        impact: 'Direct impact on patient safety and clinical outcomes',
        testingRequirements: ['Extensive validation', 'Error handling', 'Failsafe mechanisms'],
        monitoringRequired: true
      };
    } else if (hasModeratekeywords) {
      return {
        level: 'moderate',
        impact: 'Indirect impact on patient care quality',
        testingRequirements: ['Standard validation', 'User acceptance testing'],
        monitoringRequired: true
      };
    } else {
      return {
        level: 'low',
        impact: 'Minimal direct clinical impact',
        testingRequirements: ['Basic functional testing'],
        monitoringRequired: false
      };
    }
  }

  // NEW: Extract acceptance criteria from surrounding text
  extractAcceptanceCriteria(fullText, storyIndex) {
    const acceptanceCriteria = [];
    
    // Look for acceptance criteria patterns near the user story
    const contextWindow = 500; // Characters to search around the story
    const startIndex = Math.max(0, storyIndex - contextWindow);
    const endIndex = Math.min(fullText.length, storyIndex + contextWindow);
    const contextText = fullText.substring(startIndex, endIndex);
    
    // Common acceptance criteria patterns
    const patterns = [
      /Given (.+?), when (.+?), then (.+?)[\.\n]/gi,
      /Acceptance criteria:\s*(.+?)(?=\n\n|\n[A-Z]|\n\s*$)/gi,
      /AC\d+:?\s*(.+?)[\.\n]/gi,
      /Criteria:\s*(.+?)[\.\n]/gi,
      /- (.+?) should (.+?)[\.\n]/gi
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(contextText)) !== null) {
        const criterion = match[1] ? 
          `Given ${match[1]}, when ${match[2]}, then ${match[3]}` : 
          match[0].trim();
        
        if (criterion.length > 10 && !acceptanceCriteria.includes(criterion)) {
          acceptanceCriteria.push(criterion);
        }
      }
    });
    
    return acceptanceCriteria;
  }

  extractRequirementsFromText(text) {
    const requirements = [];
    const lines = text.split('\n').filter(line => line.trim());
    
    lines.forEach((line, index) => {
      if (line.toLowerCase().includes('requirement') || 
          line.toLowerCase().includes('shall') || 
          line.toLowerCase().includes('must') ||
          line.toLowerCase().includes('should') ||
          line.toLowerCase().includes('test') ||
          line.toLowerCase().includes('verify') ||
          line.toLowerCase().includes('validate')) {
        requirements.push({
          id: `REQ-${String(index + 1).padStart(3, '0')}`,
          text: line.trim(),
          category: this.categorizeRequirement(line),
          compliance: ['HIPAA'],
          risk: this.assessRisk(line),
          priority: 'medium',
          source: 'text_file'
        });
      }
    });
    
    return requirements;
  }

  categorizeRequirement(text) {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('security') || lowerText.includes('encrypt') || lowerText.includes('access') || lowerText.includes('authentication')) {
      return 'security';
    }
    if (lowerText.includes('audit') || lowerText.includes('log') || lowerText.includes('compliance') || lowerText.includes('hipaa')) {
      return 'compliance';
    }
    if (lowerText.includes('data') || lowerText.includes('patient') || lowerText.includes('record')) {
      return 'data_management';
    }
    if (lowerText.includes('test') || lowerText.includes('verify') || lowerText.includes('validate')) {
      return 'testing';
    }
    return 'functional';
  }

  assessRisk(text) {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('critical') || lowerText.includes('security') || lowerText.includes('patient safety')) {
      return 'high';
    }
    if (lowerText.includes('compliance') || lowerText.includes('audit') || lowerText.includes('encryption')) {
      return 'high';
    }
    if (lowerText.includes('performance') || lowerText.includes('availability')) {
      return 'medium';
    }
    return 'low';
  }

  extractHealthcareData(document) {
    const extractedData = {
      fullText: document.text || '',
      requirements: [],
      entities: [],
      formFields: [],
      tables: [],
      userStories: [] // NEW: Initialize user stories array
    };

    // Extract form fields
    if (document.pages) {
      document.pages.forEach(page => {
        if (page.formFields) {
          page.formFields.forEach(field => {
            const fieldName = this.getTextFromAnchor(field.fieldName?.textAnchor, document);
            const fieldValue = this.getTextFromAnchor(field.fieldValue?.textAnchor, document);
            
            if (fieldName || fieldValue) {
              const formField = {
                name: fieldName || 'Unknown Field',
                value: fieldValue || '',
                type: this.categorizeHealthcareField(fieldName),
                confidence: field.fieldName?.confidence || 0.8
              };
              
              extractedData.formFields.push(formField);
              
              // Check if this is a requirement
              if (this.isRequirement(fieldName, fieldValue)) {
                extractedData.requirements.push({
                  id: `REQ-${String(extractedData.requirements.length + 1).padStart(3, '0')}`,
                  text: `${fieldName}: ${fieldValue}`,
                  category: this.categorizeRequirement(fieldValue),
                  source: 'form_field',
                  priority: 'medium',
                  risk: this.assessRisk(fieldValue),
                  compliance: ['HIPAA']
                });
              }
            }
          });
        }
      });
    }

    // Extract entities
    if (document.entities) {
      document.entities.forEach(entity => {
        extractedData.entities.push({
          text: entity.mentionText || '',
          type: entity.type || 'UNKNOWN',
          confidence: entity.confidence || 0.0
        });
      });
    }

    // Extract tables
    if (document.pages) {
      document.pages.forEach(page => {
        if (page.tables) {
          page.tables.forEach(table => {
            extractedData.tables.push(this.extractTableData(table, document));
          });
        }
      });
    }

    // Extract requirements from full text
    if (extractedData.fullText) {
      const textRequirements = this.extractRequirementsFromText(extractedData.fullText);
      extractedData.requirements = extractedData.requirements.concat(textRequirements);
      
      // NEW: Process user stories from extracted text
      extractedData.userStories = this.processUserStories(extractedData.fullText);
    }

    return extractedData;
  }

  extractTableData(table, document) {
    return {
      headers: table.headerRows?.map(row =>
        row.cells.map(cell => this.getTextFromAnchor(cell.layout.textAnchor, document).trim())
      ) || [],
      rows: table.bodyRows.map(row =>
        row.cells.map(cell => this.getTextFromAnchor(cell.layout.textAnchor, document).trim())
      )
    };
  }

  getTextFromAnchor(textAnchor, document) {
    if (!textAnchor || !document.text) return '';
    
    const startIndex = textAnchor.textSegments?.[0]?.startIndex || 0;
    const endIndex = textAnchor.textSegments?.[0]?.endIndex || startIndex;
    
    return document.text.substring(parseInt(startIndex), parseInt(endIndex));
  }

  categorizeHealthcareField(fieldName) {
    if (!fieldName) return 'general';
    
    const name = fieldName.toLowerCase();
    if (name.includes('patient') || name.includes('name')) return 'patient_info';
    if (name.includes('diagnosis') || name.includes('condition')) return 'clinical';
    if (name.includes('medication') || name.includes('drug')) return 'medication';
    if (name.includes('test') || name.includes('result')) return 'testing';
    if (name.includes('procedure') || name.includes('treatment')) return 'procedure';
    return 'general';
  }

  isRequirement(fieldName, fieldValue) {
    if (!fieldValue || fieldValue.length < 10) return false;
    
    const requirementKeywords = [
      'must', 'shall', 'should', 'required', 'compliance', 'validation',
      'test', 'verify', 'ensure', 'check', 'authenticate', 'authorize'
    ];
    
    const text = (fieldName + ' ' + fieldValue).toLowerCase();
    return requirementKeywords.some(keyword => text.includes(keyword));
  }

  handleDocumentError(error) {
    if (error.code === 3) {
      return new Error('Invalid document format or corrupted file');
    }
    if (error.code === 5) {
      return new Error('Document processor not found - check configuration');
    }
    if (error.code === 7) {
      return new Error('Authentication failed - check service account permissions');
    }
    if (error.code === 8) {
      return new Error('Processing quota exceeded - try again later');
    }
    return new Error(`Document processing failed: ${error.message}`);
  }
}

export default new HealthcareDocumentProcessor();