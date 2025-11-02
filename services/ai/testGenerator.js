// src/services/ai/testGenerator.js
import { GoogleGenerativeAI } from '@google/generative-ai';

class GeminiService {
  constructor() {
    this.genAI = null;
    this.model = null;
  }

  async initialize() {
    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY not found in environment variables');
      }

      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      
      console.log('✅ Gemini AI Service initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Gemini Service:', error.message);
      throw error;
    }
  }

  async generateTestCases(requirements, testType = 'functional') {
    try {
      if (!this.model) {
        await this.initialize();
      }

      const prompt = this.buildTestGenerationPrompt(requirements, testType);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return this.parseTestCases(text);
    } catch (error) {
      console.error('Error generating test cases:', error);
      throw new Error(\`Test generation failed: \${error.message}\`);
    }
  }

  buildTestGenerationPrompt(requirements, testType) {
    return \`
You are a healthcare software testing expert. Generate comprehensive \${testType} test cases for the following healthcare requirements.

Requirements:
\${JSON.stringify(requirements, null, 2)}

Please generate test cases in the following JSON format:
{
  \"testCases\": [
    {
      \"id\": \"TC001\",
      \"title\": \"Test case title\",
      \"description\": \"Detailed description\",
      \"preconditions\": [\"List of preconditions\"],
      \"steps\": [
        {
          \"stepNumber\": 1,
          \"action\": \"Action to perform\",
          \"expectedResult\": \"Expected outcome\"
        }
      ],
      \"priority\": \"High|Medium|Low\",
      \"type\": \"\${testType}\",
      \"tags\": [\"healthcare\", \"hipaa\"]
    }
  ]
}

Focus on HIPAA compliance, patient safety, and regulatory requirements.
\`;
  }

  parseTestCases(text) {
    try {
      const jsonText = text.replace(/\`\`\`json\n?/g, '').replace(/\`\`\`\n?/g, '').trim();
      const parsed = JSON.parse(jsonText);
      return parsed.testCases || [];
    } catch (error) {
      console.error('Error parsing test cases:', error);
      return [];
    }
  }
}

export default new GeminiService();
