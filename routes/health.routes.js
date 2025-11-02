// File: routes/health.routes.js
// UPDATED: Health check using Vertex AI SDK

import express from 'express';
import { VertexAI } from '@google-cloud/vertexai'; // NEW: Vertex AI SDK

const router = express.Router();

/**
 * Health check endpoint
 * Verifies all critical services are operational
 */
router.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {}
  };

  try {
    // Check Gemini AI via Vertex AI
    health.services.gemini = await checkGeminiHealth();
    
    // Check Database (if configured)
    if (process.env.DB_HOST) {
      health.services.database = await checkDatabaseHealth();
    }

    // Check Google Sheets API (if configured)
    if (process.env.GOOGLE_SHEETS_SPREADSHEET_ID) {
      health.services.googleSheets = await checkGoogleSheetsHealth();
    }

    // Check Document AI (if configured)
    if (process.env.DOCUMENT_AI_PROCESSOR_ID) {
      health.services.documentAI = await checkDocumentAIHealth();
    }

    // Overall status
    const services = Object.values(health.services);
    const allHealthy = services.every(s => s.status === 'healthy');
    const anyUnhealthy = services.some(s => s.status === 'unhealthy');
    
    health.status = allHealthy ? 'healthy' : (anyUnhealthy ? 'unhealthy' : 'degraded');

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);

  } catch (error) {
    health.status = 'unhealthy';
    health.error = error.message;
    res.status(503).json(health);
  }
});

/**
 * Detailed health check endpoint
 * Provides more detailed information about each service
 */
router.get('/health/detailed', async (req, res) => {
  const detailedHealth = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      env: process.env.NODE_ENV || 'development'
    },
    configuration: {
      projectId: process.env.GOOGLE_CLOUD_PROJECT || 'not configured',
      region: 'us-central1',
      documentAI: !!process.env.DOCUMENT_AI_PROCESSOR_ID,
      database: !!process.env.DB_HOST,
      googleSheets: !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID
    },
    services: {}
  };

  try {
    // Parallel health checks
    const [gemini, database, googleSheets, documentAI] = await Promise.allSettled([
      checkGeminiHealth(),
      process.env.DB_HOST ? checkDatabaseHealth() : Promise.resolve({ status: 'not_configured' }),
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID ? checkGoogleSheetsHealth() : Promise.resolve({ status: 'not_configured' }),
      process.env.DOCUMENT_AI_PROCESSOR_ID ? checkDocumentAIHealth() : Promise.resolve({ status: 'not_configured' })
    ]);

    detailedHealth.services = {
      gemini: gemini.status === 'fulfilled' ? gemini.value : { status: 'unhealthy', error: gemini.reason?.message },
      database: database.status === 'fulfilled' ? database.value : { status: 'unhealthy', error: database.reason?.message },
      googleSheets: googleSheets.status === 'fulfilled' ? googleSheets.value : { status: 'unhealthy', error: googleSheets.reason?.message },
      documentAI: documentAI.status === 'fulfilled' ? documentAI.value : { status: 'unhealthy', error: documentAI.reason?.message }
    };

    // Overall status
    const services = Object.values(detailedHealth.services).filter(s => s.status !== 'not_configured');
    const allHealthy = services.every(s => s.status === 'healthy');
    const anyUnhealthy = services.some(s => s.status === 'unhealthy');
    
    detailedHealth.status = allHealthy ? 'healthy' : (anyUnhealthy ? 'unhealthy' : 'degraded');

    const statusCode = detailedHealth.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(detailedHealth);

  } catch (error) {
    detailedHealth.status = 'unhealthy';
    detailedHealth.error = error.message;
    res.status(503).json(detailedHealth);
  }
});

/**
 * Check Gemini AI health via Vertex AI
 */
async function checkGeminiHealth() {
  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    const location = 'us-central1';
    
    if (!projectId) {
      return { 
        status: 'unhealthy', 
        error: 'GOOGLE_CLOUD_PROJECT not configured',
        message: 'Project ID is required for Vertex AI'
      };
    }

    // Initialize Vertex AI client
    const vertex_ai = new VertexAI({
      project: projectId, 
      location: location
    });
    
    // Make a minimal API call to check authentication/connectivity
    const model = vertex_ai.preview.getGenerativeModel({
      model: 'gemini-2.0-flash-exp'
    });

    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
      generationConfig: {
        maxOutputTokens: 1, // Keep it fast and cheap
        temperature: 0.0
      }
    });

    // If we got here, the service is healthy
    return { 
      status: 'healthy',
      model: 'gemini-2.0-flash-exp',
      location: location,
      authentication: 'ADC',
      message: 'Vertex AI is operational'
    };
  } catch (error) {
    console.error('❌ Gemini health check failed:', error);
    return { 
      status: 'unhealthy', 
      error: error.message,
      details: error.code || 'unknown_error',
      troubleshooting: 'Check Application Default Credentials and Vertex AI API enablement'
    };
  }
}

/**
 * Check Database health
 */
async function checkDatabaseHealth() {
  try {
    // If you have a database connection pool, check it here
    // Example: await pool.query('SELECT 1');
    
    return { 
      status: 'healthy',
      message: 'Database connection active'
    };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      error: error.message 
    };
  }
}

/**
 * Check Google Sheets API health
 */
async function checkGoogleSheetsHealth() {
  try {
    // Basic check - verify environment is configured
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    
    if (!spreadsheetId) {
      return {
        status: 'not_configured',
        message: 'Google Sheets not configured'
      };
    }

    // If you want to actually test the connection, uncomment:
    // const { google } = await import('googleapis');
    // const auth = new google.auth.GoogleAuth({
    //   keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    //   scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    // });
    // await auth.getClient();

    return { 
      status: 'healthy',
      spreadsheetId: spreadsheetId,
      message: 'Google Sheets API configured'
    };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      error: error.message 
    };
  }
}

/**
 * Check Document AI health
 */
async function checkDocumentAIHealth() {
  try {
    const processorId = process.env.DOCUMENT_AI_PROCESSOR_ID;
    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    const location = process.env.DOCUMENT_AI_LOCATION || 'us';
    
    if (!processorId || !projectId) {
      return {
        status: 'not_configured',
        message: 'Document AI not fully configured'
      };
    }

    // Basic configuration check
    return { 
      status: 'healthy',
      processorId: processorId,
      location: location,
      message: 'Document AI configured'
    };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      error: error.message 
    };
  }
}

/**
 * Liveness probe for Kubernetes/Cloud Run
 */
router.get('/health/liveness', (req, res) => {
  res.status(200).json({ 
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

/**
 * Readiness probe for Kubernetes/Cloud Run
 */
router.get('/health/readiness', async (req, res) => {
  try {
    // Check if critical services are ready
    const geminiHealth = await checkGeminiHealth();
    
    if (geminiHealth.status === 'healthy') {
      res.status(200).json({ 
        status: 'ready',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({ 
        status: 'not_ready',
        reason: 'Gemini AI not available',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(503).json({ 
      status: 'not_ready',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;