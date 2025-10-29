// src/services/ai/documentAI.js
import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import fs from 'fs/promises';
import path from 'path';

class DocumentAIService {
  constructor() {
    this.client = null;
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT || 'pro-variety-472211-b9';
    this.location = process.env.DOCUMENT_AI_LOCATION || 'us';
    this.processorId = process.env.DOCUMENT_AI_PROCESSOR_ID;
  }

  async initialize() {
    try {
      const keyFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      
      if (!keyFilePath || keyFilePath === './medtestai-sa-key.json') {
        console.warn('⚠️  Document AI: Using mock mode (no service account key)');
        this.client = null;
        return true;
      }

      this.client = new DocumentProcessorServiceClient({
        keyFilename: keyFilePath
      });

      console.log('✅ Document AI Service initialized');
      return true;
    } catch (error) {
      console.warn('⚠️  Document AI initialization failed, using mock mode:', error.message);
      this.client = null;
      return true;
    }
  }

  async processDocument(filePath, mimeType = 'application/pdf') {
    try {
      if (!this.client || !this.processorId) {
        console.log('📄 Using mock document processing');
        return this.getMockProcessedData(filePath);
      }

      const fileBuffer = await fs.readFile(filePath);
      const encodedFile = fileBuffer.toString('base64');

      const name = \`projects/\${this.projectId}/locations/\${this.location}/processors/\${this.processorId}\`;
      
      const request = {
        name,
        rawDocument: {
          content: encodedFile,
          mimeType: mimeType
        }
      };

      const [result] = await this.client.processDocument(request);
      return this.extractStructuredData(result.document);
    } catch (error) {
      console.error('Document AI error, falling back to mock:', error.message);
      return this.getMockProcessedData(filePath);
    }
  }

  extractStructuredData(document) {
    return {
      text: document.text || '',
      entities: (document.entities || []).map(entity => ({
        type: entity.type,
        mentionText: entity.mentionText,
        confidence: entity.confidence
      })),
      requirements: this.extractRequirements(document.text || '')
    };
  }

  extractRequirements(text) {
    const requirements = [];
    const patterns = [
      /(?:requirement|req|user story)[:\s]+([^\n]+)/gi,
      /(?:the system shall|must|should)[:\s]+([^\n]+)/gi
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match[1] && match[1].trim().length > 10) {
          requirements.push({
            text: match[1].trim(),
            type: 'extracted',
            source: 'document'
          });
        }
      }
    });

    return requirements;
  }

  async getMockProcessedData(filePath) {
    const fileName = path.basename(filePath);
    
    return {
      text: \`Healthcare Requirements Document

REQ-001: The system shall authenticate users using multi-factor authentication
REQ-002: The system must encrypt all PHI data at rest and in transit
REQ-003: User sessions shall timeout after 15 minutes of inactivity
REQ-004: The system should maintain audit logs of all PHI access
REQ-005: Password complexity must meet HIPAA requirements\`,
      
      entities: [
        { type: 'SECURITY', mentionText: 'multi-factor authentication', confidence: 0.95 },
        { type: 'COMPLIANCE', mentionText: 'HIPAA requirements', confidence: 0.98 }
      ],
      
      requirements: [
        { text: 'The system shall authenticate users using multi-factor authentication', type: 'security', source: 'document' },
        { text: 'The system must encrypt all PHI data at rest and in transit', type: 'security', source: 'document' },
        { text: 'User sessions shall timeout after 15 minutes of inactivity', type: 'security', source: 'document' }
      ],
      
      metadata: {
        fileName,
        processed: new Date().toISOString(),
        mock: true
      }
    };
  }
}

export default new DocumentAIService();
