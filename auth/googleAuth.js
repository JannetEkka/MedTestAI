// File: auth/googleAuth.js
// UPDATED: Uses Vertex AI SDK with Application Default Credentials (ADC)

import { GoogleAuth } from 'google-auth-library';
import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import { VertexAI } from '@google-cloud/vertexai'; // NEW: Vertex AI SDK

class HealthcareAIClients {
  constructor() {
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT;
    this.location = 'us-central1'; // Vertex AI region for Gemini
    this.auth = new GoogleAuth({
      projectId: this.projectId,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    
    // Initialize clients
    this.documentAI = null;
    this.gemini = null; // This will hold the GenerativeModel instance
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      console.log('🔐 Initializing Healthcare AI clients with ADC...');

      // Initialize Document AI client
      this.documentAI = new DocumentProcessorServiceClient({
        projectId: this.projectId,
        apiEndpoint: `${process.env.DOCUMENT_AI_LOCATION}-documentai.googleapis.com`
      });

      // --- UPDATED: Initialize Gemini client using Vertex AI SDK and ADC ---
      const vertex_ai = new VertexAI({
        project: this.projectId, 
        location: this.location
      });
      
      this.gemini = vertex_ai.preview.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
          responseMimeType: "application/json"
        }
      });
      // --- END UPDATE ---

      this.initialized = true;
      console.log('✅ Healthcare AI clients initialized successfully (using Vertex AI ADC)');
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

  // Helper method to get authenticated client for other Google APIs
  async getAuthClient() {
    return await this.auth.getClient();
  }

  // Get project ID
  getProjectId() {
    return this.projectId;
  }
}

export default new HealthcareAIClients();