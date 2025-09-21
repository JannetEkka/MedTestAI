import { GoogleAuth } from 'google-auth-library';
import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import { GoogleGenerativeAI } from '@google/generative-ai';

class HealthcareAIClients {
  constructor() {
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT;
    this.auth = new GoogleAuth({
      projectId: this.projectId,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    
    // Initialize clients
    this.documentAI = null;
    this.gemini = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize Document AI client
      this.documentAI = new DocumentProcessorServiceClient({
        projectId: this.projectId,
        apiEndpoint: `${process.env.DOCUMENT_AI_LOCATION}-documentai.googleapis.com`
      });

      // Initialize Gemini client
      this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

      this.initialized = true;
      console.log('✅ Healthcare AI clients initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize clients:', error);
      throw error;
    }
  }

  async getDocumentAIClient() {
    await this.initialize();
    return this.documentAI;
  }

  async getGeminiClient() {
    await this.initialize();
    return this.gemini;
  }
}

export default new HealthcareAIClients();
