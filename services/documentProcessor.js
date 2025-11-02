// services/documentProcessor.js - ENHANCED WITH FALLBACK
// This version gracefully handles Document AI failures and provides detailed error reporting

import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import fs from 'fs/promises';
import path from 'path';

class DocumentProcessor {
  constructor() {
    this.client = null;
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT || 'pro-variety-472211-b9';
    this.location = 'us';
    this.processorId = process.env.DOCUMENT_AI_PROCESSOR_ID || 'c1ed1597820769df';
    
    this.processorName = `projects/${this.projectId}/locations/${this.location}/processors/${this.processorId}`;
    this.isDocumentAIAvailable = false;
    this.initializationAttempted = false;
  }

  async initialize() {
    if (this.initializationAttempted && this.isDocumentAIAvailable) {
      return true;
    }

    this.initializationAttempted = true;

    try {
      console.log('📡 [DocumentProcessor] Initializing Document AI client...');
      console.log('📋 [DocumentProcessor] Project ID:', this.projectId);
      console.log('📋 [DocumentProcessor] Processor:', this.processorName);

      this.client = new DocumentProcessorServiceClient({
        apiEndpoint: 'us-documentai.googleapis.com'
      });
      
      // Test the connection by trying to access the processor
      try {
        // This will throw if we don't have access
        await this.client.getProcessor({ name: this.processorName });
        console.log('✅ [DocumentProcessor] Document AI client initialized successfully');
        this.isDocumentAIAvailable = true;
        return true;
      } catch (accessError) {
        console.error('❌ [DocumentProcessor] Cannot access Document AI processor:', accessError.message);
        console.error('   Possible causes:');
        console.error('   - Document AI API not enabled');
        console.error('   - Service account lacks permissions');
        console.error('   - Processor ID incorrect or not in this project');
        this.isDocumentAIAvailable = false;
        return false;
      }
      
    } catch (error) {
      console.error('❌ [DocumentProcessor] Document AI initialization failed:', error.message);
      console.error('   Full error:', error);
      this.isDocumentAIAvailable = false;
      return false;
    }
  }

  async processDocument(filePath, fileName) {
    console.log(`📄 [DocumentProcessor] Processing: ${fileName}`);
    
    try {
      const fileExt = path.extname(fileName).toLowerCase();
      
      // Try Document AI first
      if (!this.initializationAttempted) {
        await this.initialize();
      }

      if (this.isDocumentAIAvailable && this.client) {
        try {
          console.log('📤 [DocumentProcessor] Using Document AI processor...');
          return await this.processWithDocumentAI(filePath, fileName, fileExt);
        } catch (docAIError) {
          console.error('❌ [DocumentProcessor] Document AI processing failed:', docAIError.message);
          console.warn('⚠️  [DocumentProcessor] Falling back to text extraction...');
          this.isDocumentAIAvailable = false; // Mark as unavailable for subsequent requests
        }
      } else {
        console.warn('⚠️  [DocumentProcessor] Document AI not available, using fallback from start');
      }

      // Fallback to text extraction
      return await this.fallbackProcessing(filePath, fileName, fileExt);
      
    } catch (error) {
      console.error('❌ [DocumentProcessor] Critical processing error:', error);
      throw new Error(`Document processing failed: ${error.message}`);
    }
  }

  async processWithDocumentAI(filePath, fileName, fileExt) {
    // Read file
    const fileBuffer = await fs.readFile(filePath);
    
    // Process with Document AI
    const request = {
      name: this.processorName,
      rawDocument: {
        content: fileBuffer.toString('base64'),
        mimeType: fileExt === '.pdf' ? 'application/pdf' : 'text/plain'
      }
    };

    console.log('📤 [DocumentProcessor] Sending to Document AI...');
    const [result] = await this.client.processDocument(request);
    
    const { document } = result;
    const text = document.text || '';
    
    console.log(`✅ [DocumentProcessor] Document AI extraction successful`);
    console.log(`   Extracted ${text.length} characters`);
    console.log(`   Found ${document.entities?.length || 0} entities`);

    // Extract requirements from Document AI output
    const requirements = this.extractRequirements(document);
    
    console.log(`✅ [DocumentProcessor] Extracted ${requirements.length} requirements using Document AI`);

    return {
      success: true,
      text: text,
      requirements: requirements,
      documentType: fileExt,
      fileName: fileName,
      processedAt: new Date().toISOString(),
      processingMethod: 'Document AI Custom Extractor',
      serviceStatus: {
        documentAI: true,
        cloudStorage: false,
        geminiAI: true
      },
      metadata: {
        fileSize: fileBuffer.length,
        requirementCount: requirements.length,
        entities: document.entities?.length || 0,
        pageCount: document.pages?.length || 0
      }
    };
  }

  async fallbackProcessing(filePath, fileName, fileExt) {
    console.log('📄 [DocumentProcessor] Using fallback text extraction...');
    
    if (fileExt === '.pdf') {
      return await this.processPDFWithFallback(filePath, fileName);
    } else {
      return await this.processTextFile(filePath, fileName, fileExt);
    }
  }

  async processPDFWithFallback(filePath, fileName) {
    try {
      // Try using pdf-parse if available
      const pdfParse = await import('pdf-parse');
      const fileBuffer = await fs.readFile(filePath);
      const data = await pdfParse.default(fileBuffer);
      
      const text = data.text;
      console.log(`✅ [DocumentProcessor] PDF parsed: ${text.length} characters, ${data.numpages} pages`);
      
      const requirements = this.extractRequirementsFromText(text);
      
      return {
        success: true,
        text: text,
        requirements: requirements,
        documentType: '.pdf',
        fileName: fileName,
        processedAt: new Date().toISOString(),
        processingMethod: 'PDF Parser (Fallback)',
        serviceStatus: {
          documentAI: false,
          cloudStorage: false,
          geminiAI: true
        },
        metadata: {
          fileSize: fileBuffer.length,
          requirementCount: requirements.length,
          pageCount: data.numpages
        }
      };
      
    } catch (pdfError) {
      console.error('❌ [DocumentProcessor] PDF parsing failed:', pdfError.message);
      console.warn('⚠️  [DocumentProcessor] Attempting basic text extraction...');
      
      // Last resort: try to extract any text we can
      const fileBuffer = await fs.readFile(filePath, 'utf-8').catch(() => {
        return fs.readFile(filePath).then(buf => buf.toString('binary'));
      });
      
      // Extract readable text (very basic)
      const text = fileBuffer.replace(/[^\x20-\x7E\n\r\t]/g, '');
      const requirements = this.extractRequirementsFromText(text);
      
      return {
        success: true,
        text: text,
        requirements: requirements,
        documentType: '.pdf',
        fileName: fileName,
        processedAt: new Date().toISOString(),
        processingMethod: 'Basic Text Extraction (Limited)',
        serviceStatus: {
          documentAI: false,
          cloudStorage: false,
          geminiAI: true
        },
        metadata: {
          fileSize: fileBuffer.length,
          requirementCount: requirements.length,
          warning: 'PDF processing failed, using basic extraction - install pdf-parse for better results'
        }
      };
    }
  }

  async processTextFile(filePath, fileName, fileExt) {
    const fileBuffer = await fs.readFile(filePath, 'utf-8');
    const requirements = this.extractRequirementsFromText(fileBuffer);
    
    console.log(`✅ [DocumentProcessor] Text file processed: ${requirements.length} requirements extracted`);
    
    return {
      success: true,
      text: fileBuffer,
      requirements: requirements,
      documentType: fileExt,
      fileName: fileName,
      processedAt: new Date().toISOString(),
      processingMethod: 'Text File Reading',
      serviceStatus: {
        documentAI: false,
        cloudStorage: false,
        geminiAI: true
      },
      metadata: {
        fileSize: fileBuffer.length,
        requirementCount: requirements.length
      }
    };
  }

  extractRequirements(document) {
    const requirements = [];
    
    // Extract from Document AI entities (custom fields)
    if (document.entities && document.entities.length > 0) {
      console.log(`📊 [DocumentProcessor] Processing ${document.entities.length} entities from Document AI`);
      
      for (const entity of document.entities) {
        // Look for requirement-type entities
        if (entity.type === 'requirement' || 
            entity.type === 'requirement_text' ||
            entity.type === 'functional_requirement' ||
            entity.type === 'non_functional_requirement' ||
            entity.mentionText?.toLowerCase().includes('shall') ||
            entity.mentionText?.toLowerCase().includes('must') ||
            entity.mentionText?.toLowerCase().includes('should')) {
          
          requirements.push({
            text: entity.mentionText,
            confidence: entity.confidence || 0,
            type: entity.type,
            page: entity.pageAnchor?.pageRefs?.[0]?.page || 0,
            category: this.categorizeRequirement(entity.mentionText),
            source: 'document_ai'
          });
        }
      }
    }
    
    // Fallback: Extract from text using patterns if entities didn't yield results
    if (requirements.length === 0 && document.text) {
      console.log('📊 [DocumentProcessor] No entities found, extracting from text patterns');
      return this.extractRequirementsFromText(document.text);
    }
    
    console.log(`✅ [DocumentProcessor] Extracted ${requirements.length} requirements from entities`);
    return requirements;
  }

  extractRequirementsFromText(text) {
    const requirements = [];
    const lines = text.split('\n');
    
    console.log(`📊 [DocumentProcessor] Analyzing ${lines.length} lines of text`);
    
    // Pattern 1: Numbered requirements (1., 1.1., 1.1.1, etc.)
    const numberedPattern = /^[\s]*[\d]+(\.|:)[\d]*\s+(.+)$/;
    
    // Pattern 2: Requirements with keywords
    const keywordPattern = /\b(requirement|req|shall|must|should|will|the system|the application|the software)[\s:]+(.{20,})/i;
    
    // Pattern 3: Bullet points
    const bulletPattern = /^[\s]*[•\-\*➤▪]\s+(.+)$/;
    
    // Pattern 4: "FR-" or "NFR-" style IDs
    const idPattern = /^[\s]*(FR|NFR|UC|TC|REQ)[\-_][\d]+[\s:]+(.+)/i;
    
    let foundCount = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip very short lines or common non-requirement text
      if (trimmed.length < 15) continue;
      if (trimmed.match(/^(page|chapter|section|\d+\/\d+)$/i)) continue;
      
      // Check ID-based requirements (highest confidence)
      const idMatch = trimmed.match(idPattern);
      if (idMatch) {
        requirements.push({
          text: idMatch[2].trim(),
          confidence: 0.95,
          type: 'id_based',
          category: this.categorizeRequirement(idMatch[2]),
          source: 'pattern_match'
        });
        foundCount++;
        continue;
      }
      
      // Check numbered requirements
      const numberedMatch = trimmed.match(numberedPattern);
      if (numberedMatch) {
        const reqText = numberedMatch[2].trim();
        if (reqText.length >= 20) { // Only substantial requirements
          requirements.push({
            text: reqText,
            confidence: 0.9,
            type: 'numbered',
            category: this.categorizeRequirement(reqText),
            source: 'pattern_match'
          });
          foundCount++;
          continue;
        }
      }
      
      // Check keyword requirements
      const keywordMatch = trimmed.match(keywordPattern);
      if (keywordMatch) {
        const reqText = keywordMatch[2].trim();
        if (reqText.length >= 20) {
          requirements.push({
            text: reqText,
            confidence: 0.85,
            type: 'keyword',
            category: this.categorizeRequirement(reqText),
            source: 'pattern_match'
          });
          foundCount++;
          continue;
        }
      }
      
      // Check bullet points
      const bulletMatch = trimmed.match(bulletPattern);
      if (bulletMatch) {
        const reqText = bulletMatch[1].trim();
        if (reqText.length >= 20) {
          requirements.push({
            text: reqText,
            confidence: 0.75,
            type: 'bullet',
            category: this.categorizeRequirement(reqText),
            source: 'pattern_match'
          });
          foundCount++;
        }
      }
    }
    
    // If we still haven't found any requirements, be more aggressive
    if (requirements.length === 0) {
      console.warn('⚠️  [DocumentProcessor] No patterns matched, using aggressive extraction');
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        // Look for any substantial line that might be a requirement
        if (trimmed.length >= 30 && 
            !trimmed.match(/^(page|chapter|section|table|figure|\d+\/\d+)$/i) &&
            !trimmed.match(/^[^\w]+$/) && // Skip lines with only special characters
            trimmed.split(' ').length >= 5) { // At least 5 words
          
          requirements.push({
            text: trimmed,
            confidence: 0.5,
            type: 'text_line',
            category: this.categorizeRequirement(trimmed),
            source: 'aggressive_fallback'
          });
        }
      }
    }
    
    // Remove duplicates (case-insensitive)
    const uniqueRequirements = [];
    const seen = new Set();
    
    for (const req of requirements) {
      const normalized = req.text.toLowerCase().substring(0, 50);
      if (!seen.has(normalized)) {
        seen.add(normalized);
        uniqueRequirements.push(req);
      }
    }
    
    console.log(`✅ [DocumentProcessor] Extracted ${uniqueRequirements.length} unique requirements`);
    
    // Limit to top 100 requirements to avoid overwhelming the system
    return uniqueRequirements.slice(0, 100);
  }

  categorizeRequirement(text) {
    const lower = text.toLowerCase();
    
    if (lower.match(/\b(security|encrypt|authentication|authorization|access control|secure|protect|privacy)\b/)) {
      return 'security';
    }
    if (lower.match(/\b(performance|speed|latency|throughput|response time|scalability)\b/)) {
      return 'performance';
    }
    if (lower.match(/\b(user interface|ui|ux|display|screen|button|menu|navigation)\b/)) {
      return 'ui';
    }
    if (lower.match(/\b(data|database|storage|record|information|persistence)\b/)) {
      return 'data';
    }
    if (lower.match(/\b(integration|api|interface|external|third-party|connect)\b/)) {
      return 'integration';
    }
    if (lower.match(/\b(compliance|hipaa|gdpr|regulation|legal|policy)\b/)) {
      return 'compliance';
    }
    
    return 'functional';
  }
}

export default new DocumentProcessor();