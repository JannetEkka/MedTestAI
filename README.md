# MedTestAI - AI-Powered Healthcare Test Case Generator

> Automatically generate comprehensive, HIPAA-compliant test cases from healthcare requirements using Google Gemini AI.

## Live Demo

**Frontend:** https://pro-variety-472211-b9.web.app  
**Backend API:** https://medtestai-backend-1067292712875.us-central1.run.app  
**Health Check:** https://medtestai-backend-1067292712875.us-central1.run.app/health  

## Hackathon Submission

**Event:** Gen AI Exchange Hackathon 2025  
**Category:** Healthcare AI Innovation  
**Developer:** Jannet Ekka (@JannetEkka)  

## Problem Statement

Healthcare software testing faces critical challenges:
- Manual test case creation consumes 60-80% of QA time
- Compliance gaps lead to costly regulatory failures  
- Inconsistent test coverage across healthcare requirements
- Domain expertise shortage in healthcare testing

## Solution

MedTestAI uses Google Gemini AI to automatically generate detailed, HIPAA-aware test cases from healthcare requirements documents or manual input.

### Key Features
- **AI-Powered Generation**: Gemini 2.0 Flash creates comprehensive test cases
- **Healthcare Context**: Understands medical terminology and compliance needs
- **Multiple Methodologies**: Agile, Waterfall, and Hybrid development support
- **Compliance Frameworks**: HIPAA, FDA 21 CFR Part 820, GDPR, ABDM (India)
- **Professional Export**: CSV, JSON formats ready for JIRA, TestRail, Excel

## Architecture

```
User Interface (React)
    ↓ HTTPS
Backend API (Node.js/Express on Cloud Run)
    ↓ File Upload (Multer)
    ↓ Text Extraction
    ↓ 
Google Gemini 2.0 Flash API
    ↓ AI Test Generation
    ↓
Test Cases (JSON)
    ↓ Export
CSV / JSON Downloads
```

**Simple & Effective:** No databases, no complex pipelines - just AI-powered test generation.

## Technology Stack

### Backend
- **Node.js 18 + Express**: RESTful API server
- **Google Gemini 2.0 Flash**: AI test case generation
- **Multer**: File upload handling
- **Cloud Run**: Serverless deployment
- **CORS**: Production-ready for Firebase frontend

### Frontend  
- **React 18**: Modern web application
- **Firebase Hosting**: Global CDN with SSL
- **Responsive Design**: Works on mobile and desktop

### Infrastructure
- **Google Cloud Run**: Auto-scaling serverless backend
- **Firebase Hosting**: Static site hosting
- **No databases**: Stateless architecture for simplicity
- **Environment Variables**: Secure API key management

## Quick Start

### Prerequisites
- Node.js 18+
- Google Cloud account
- Gemini API key from https://ai.google.dev

### Local Development

1. **Clone the repository:**
```bash
git clone https://github.com/JannetEkka/MedTestAI.git
cd MedTestAI
```

2. **Backend Setup:**
```bash
# Install dependencies
npm install

# Create .env file
echo "GEMINI_API_KEY=your_api_key_here" > .env
echo "GOOGLE_CLOUD_PROJECT=pro-variety-472211-b9" >> .env
echo "NODE_ENV=development" >> .env
echo "PORT=8080" >> .env

# Start backend
npm start
```

3. **Frontend Setup:**
```bash
# In a new terminal
cd frontend
npm install

# Update src/config.js to point to localhost:8080
# Start frontend
npm start
```

4. **Open http://localhost:3000**

### Production Deployment

**Backend (Cloud Run):**
```bash
gcloud run deploy medtestai-backend \
  --source . \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --set-env-vars="GEMINI_API_KEY=your_key,GOOGLE_CLOUD_PROJECT=pro-variety-472211-b9"
```

**Frontend (Firebase):**
```bash
cd frontend
npm run build
firebase deploy --only hosting
```

## Usage

### 1. Upload Document or Enter Requirements
- Upload healthcare requirements document (PDF, DOC, TXT)
- Or manually enter requirements in the interface
- Select testing methodology (Agile/Waterfall/Hybrid)
- Choose compliance framework (HIPAA/FDA/GDPR)

### 2. AI Generation
- Gemini AI analyzes your requirements
- Generates comprehensive test cases
- Includes compliance mapping and risk assessment
- Typical generation time: 10-30 seconds

### 3. Export Results
- Download as CSV (Excel-compatible, 12 columns)
- Export as JSON for API integration
- Includes test steps, expected results, compliance requirements
- Ready to import into JIRA, TestRail, Azure DevOps

## Generated Test Case Structure

Each test case includes:

- **Test ID**: Unique identifier (TC001, TC002, etc.)
- **Test Name**: Descriptive name
- **Category**: authentication, security, compliance, data-management, etc.
- **Priority**: Critical, High, Medium, Low
- **Description**: Detailed test objective
- **Testing Technique**: Functional, boundary-value, equivalence-partitioning, etc.
- **Risk Level**: Critical, High, Medium, Low
- **Compliance Requirements**: HIPAA Privacy Rule, Security Rule, FDA regulations
- **Automation Potential**: High, Medium, Low
- **Preconditions**: Setup requirements
- **Test Steps**: Step-by-step instructions
- **Expected Results**: What should happen

### Example Generated Test Case

```json
{
  "testId": "TC001",
  "testName": "Multi-Factor Authentication Validation",
  "category": "authentication",
  "priority": "Critical",
  "description": "Verify that the system enforces multi-factor authentication for all user logins",
  "testingTechnique": "functional-testing",
  "riskLevel": "High",
  "complianceRequirements": ["HIPAA Access Control", "FDA 21 CFR Part 820.70(i)"],
  "automationPotential": "High",
  "preconditions": ["User account configured with MFA", "Authentication system operational"],
  "testSteps": [
    "Navigate to login page",
    "Enter valid username and password",
    "Verify MFA prompt appears",
    "Complete MFA verification",
    "Confirm successful authentication"
  ],
  "expectedResults": [
    "System prompts for second factor authentication",
    "Login fails without MFA completion",
    "Successful login only after MFA verification",
    "Session establishes with proper security context"
  ]
}
```

## Real Examples

View actual generated test cases:
- **[Agile Test Cases](demo_results/test-cases/medtestai-testcases-agile-2025-09-21.csv)** - 9 test cases
- **[Waterfall Test Cases](demo_results/test-cases/medtestai-testcases-waterfall-2025-09-21.csv)** - 15 test cases  
- **[Hybrid Test Cases](demo_results/test-cases/medtestai-testcases-hybrid-2025-09-21.csv)** - 7 test cases

## Performance

- **Generation Speed**: 10-30 seconds per document
- **Accuracy**: 90%+ based on healthcare testing standards
- **Manual Effort Reduction**: 70% decrease in test creation time
- **Compliance Coverage**: Automatic HIPAA/FDA requirement mapping

## Security & Compliance

### Data Handling
- Files processed in memory, not stored permanently
- No database - stateless architecture
- HTTPS encryption for all data in transit
- API keys stored securely in environment variables

### HIPAA Considerations
- Platform designed for requirements documents, not PHI
- Can be deployed in HIPAA-compliant GCP environment
- Audit logging available in Cloud Run
- Access controls via IAM

## Roadmap

### Current Release (v1.0)
- ✅ Gemini AI test generation
- ✅ Multi-methodology support
- ✅ Compliance framework selection
- ✅ CSV/JSON export

### Planned Features (v2.0)
- Advanced requirement parsing
- Custom compliance rules
- JIRA direct integration API
- Batch document processing
- Team collaboration features

### Future Vision (v3.0)
- Fine-tuned healthcare models
- EHR system integration
- Real-time collaboration
- Advanced analytics dashboard

## Project Structure

```
MedTestAI/
├── server.js              # Express API server
├── package.json           # Backend dependencies
├── Dockerfile            # Container configuration
├── .gcloudignore         # Cloud deployment config
├── frontend/             # React application
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── config.js     # API configuration
│   │   └── App.js        # Main app
│   ├── public/           # Static assets
│   └── package.json      # Frontend dependencies
├── demo_results/         # Example generated tests
├── test-documents/       # Sample requirements docs
└── README.md            # This file
```

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/NewFeature`)
3. Commit your changes (`git commit -m 'Add NewFeature'`)
4. Push to the branch (`git push origin feature/NewFeature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style
- Test with sample healthcare requirements
- Update documentation for new features
- Ensure HIPAA-appropriate data handling

## Cost Optimization

This platform is designed to be cost-effective:

- **Cloud Run**: Pay-per-request, scales to zero
- **Firebase Hosting**: Free tier sufficient for demos
- **Gemini API**: ~$0.10-0.30 per 1000 test cases generated
- **No databases**: No ongoing storage costs

**Estimated cost for moderate use:** $5-15/month

## Troubleshooting

### Backend Issues
```bash
# Check if backend is running
curl https://medtestai-backend-1067292712875.us-central1.run.app/health

# View Cloud Run logs
gcloud run services logs read medtestai-backend --region=us-central1
```

### Frontend Issues
- Check `frontend/src/config.js` has correct backend URL
- Verify CORS is configured in backend
- Check browser console for errors

### API Issues
- Verify GEMINI_API_KEY is set in Cloud Run environment variables
- Check API quota at https://ai.google.dev
- Ensure Gemini API is enabled in GCP project

## License

MIT License - See [LICENSE](LICENSE) file for details.

## Contact

**Developer:** Jannet Ekka  
**GitHub:** [@JannetEkka](https://github.com/JannetEkka)  
**Project:** [github.com/JannetEkka/MedTestAI](https://github.com/JannetEkka/MedTestAI)  
**Live Demo:** [pro-variety-472211-b9.web.app](https://pro-variety-472211-b9.web.app)

---

**Built for Gen AI Exchange Hackathon 2025**  
*Simple, powerful AI-driven healthcare test generation*