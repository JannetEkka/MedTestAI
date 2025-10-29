// services/documentProcessor.js - With comprehensive logging

import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import { createServiceLogger } from '../utils/logger.js';

const logger = createServiceLogger('DocumentProcessor');

class DocumentProcessor {
  constructor() {
    this.client = null;
    this.processorName = process.env.DOCUMENT_AI_PROCESSOR_NAME;
    logger.info('📄 Document Processor initialized');
  }

  async initialize() {
    logger.logStep(1, 'Initializing Document AI client');
    
    try {
      this.client = new DocumentProcessorServiceClient({
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
      });
      
      logger.info('✅ Document AI client initialized successfully', {
        processor: this.processorName
      });
    } catch (error) {
      logger.error('❌ Failed to initialize Document AI client', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async processDocument(fileBuffer, fileName, mimeType) {
    const startTime = Date.now();
    logger.logStep(1, 'Starting document processing', {
      fileName,
      mimeType,
      fileSize: `${(fileBuffer.length / 1024).toFixed(2)} KB`
    });

    try {
      // Step 1: Prepare request
      logger.logStep(2, 'Preparing Document AI request');
      const request = {
        name: this.processorName,
        rawDocument: {
          content: fileBuffer.toString('base64'),
          mimeType: mimeType
        }
      };
      logger.debug('Request prepared', { 
        processorName: this.processorName,
        contentSize: fileBuffer.length 
      });

      // Step 2: Call Document AI API
      logger.logStep(3, 'Calling Document AI API');
      const apiCallStart = Date.now();
      
      const [result] = await this.client.processDocument(request);
      
      const apiDuration = Date.now() - apiCallStart;
      logger.logAPICall('POST', 'Document AI Process', 200, apiDuration);

      // Step 3: Extract text
      logger.logStep(4, 'Extracting text from document');
      const { document } = result;
      const extractedText = document.text || '';
      
      logger.info('✅ Text extraction complete', {
        textLength: extractedText.length,
        pages: document.pages?.length || 0,
        entities: document.entities?.length || 0
      });

      // Step 4: Process entities (if any)
      if (document.entities && document.entities.length > 0) {
        logger.logStep(5, 'Processing document entities', {
          entityCount: document.entities.length
        });
        
        document.entities.forEach((entity, index) => {
          logger.debug(`Entity ${index + 1}`, {
            type: entity.type,
            mentionText: entity.mentionText,
            confidence: entity.confidence?.toFixed(3)
          });
        });
      }

      // Step 5: Return results
      const totalDuration = Date.now() - startTime;
      logger.info('✅ Document processing complete', {
        fileName,
        duration: `${totalDuration}ms`,
        success: true,
        extractedTextLength: extractedText.length
      });

      return {
        success: true,
        text: extractedText,
        pages: document.pages?.length || 0,
        entities: document.entities || [],
        processingTime: totalDuration
      };

    } catch (error) {
      const totalDuration = Date.now() - startTime;
      logger.error('❌ Document processing failed', {
        fileName,
        error: error.message,
        duration: `${totalDuration}ms`,
        stack: error.stack
      });
      
      throw new Error(`Document processing failed: ${error.message}`);
    }
  }

  async extractRequirements(text) {
    logger.logStep(1, 'Extracting requirements from text', {
      textLength: text.length
    });

    try {
      // Simple requirement extraction (can be enhanced)
      logger.logStep(2, 'Analyzing text for requirement patterns');
      
      const lines = text.split('\n').filter(line => line.trim().length > 0);
      logger.debug('Text split into lines', { lineCount: lines.length });

      const requirementKeywords = [
        'shall', 'must', 'should', 'will', 'requirement', 'feature'
      ];

      logger.logStep(3, 'Filtering requirements');
      const requirements = lines.filter(line => {
        const lowerLine = line.toLowerCase();
        return requirementKeywords.some(keyword => lowerLine.includes(keyword));
      });

      logger.info('✅ Requirements extracted', {
        totalLines: lines.length,
        requirements: requirements.length,
        extractionRate: `${((requirements.length / lines.length) * 100).toFixed(1)}%`
      });

      return requirements;

    } catch (error) {
      logger.error('❌ Requirement extraction failed', {
        error: error.message
      });
      throw error;
    }
  }
}

export default new DocumentProcessor();