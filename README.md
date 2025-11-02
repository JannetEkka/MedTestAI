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

### Current Features (v1.0)
- ✅ **AI-Powered Generation**: Gemini 2.0 Flash creates comprehensive test cases
- ✅ **Healthcare Context**: Understands medical terminology and compliance needs
- ✅ **Multiple Methodologies**: Agile, Waterfall, and Hybrid development support
- ✅ **8 Compliance Frameworks**: HIPAA, FDA 21 CFR-11, GDPR, HITRUST, SOC2, ISO-13485, ISO-27001, ABDM
- ✅ **Professional Export**: CSV, JSON, Excel formats
- ✅ **Document Upload**: Process requirements from PDF, TXT, MD files
- ✅ **Manual Input**: Enter requirements directly
- ✅ **Requirements Editor**: Edit and refine extracted requirements
- ✅ **Test Case Regeneration**: Iterate on test generation with updated requirements

### Export Formats
- **CSV**: Excel-compatible format for spreadsheet analysis
- **JSON**: Machine-readable format for API integration
- **Excel**: Optimized .xlsx format with proper formatting

All exports include: Test ID, Name, Category, Priority, Description, Preconditions, Test Steps, Expected Results, Compliance Requirements, and Risk Level.

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
CSV / JSON / Excel Downloads
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
cd frontend
npm install
npm start
```

4. **Access Application:**
- Frontend: http://localhost:3000
- Backend: http://localhost:8080

### Cloud Deployment

**Backend (Cloud Run):**
```bash
gcloud run deploy medtestai-backend \
  --source . \
  --region=us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your_key_here
```

**Frontend (Firebase):**
```bash
cd frontend
npm run build
firebase deploy --only hosting
```

## Usage Guide

### 1. Upload Requirements Document
- Click "Upload Document" 
- Select PDF, TXT, or MD file containing healthcare requirements
- System extracts requirements using Document AI

### 2. Configure Generation
- **Select Methodology**: Agile, Waterfall, or Hybrid
- **Choose Compliance**: Select one or more frameworks (HIPAA, FDA, GDPR, etc.)
- Click "Generate Test Cases"

### 3. Review & Edit
- View extracted requirements in the Requirements Editor
- Add, edit, or remove requirements as needed
- Click "Regenerate" to create new test cases

### 4. Export Test Cases
- Navigate to Export tab
- Choose format: CSV, JSON, or Excel
- Download for use in JIRA, TestRail, or other tools

## Sample Test Case

```json
{
  "testId": "TC001",
  "testName": "Verify Mandatory Fields are Required",
  "category": "functional",
  "priority": "Critical",
  "description": "Ensure the system prevents submission if mandatory fields are missing.",
  "preconditions": ["User is on patient intake form", "Form is in edit mode"],
  "testSteps": [
    "Navigate to patient intake form",
    "Leave mandatory field 'Legal first name' empty",
    "Fill all other required fields with valid data",
    "Click Submit button",
    "Verify error message appears"
  ],
  "expectedResults": "System displays error: 'Legal first name is required'",
  "complianceRequirements": ["HIPAA Privacy Rule", "21 CFR Part 11"],
  "riskLevel": "High"
}
```

## Roadmap

### v2.0 - Enhanced Integration (Q2 2025)
- 🔄 **Google Drive Export with OAuth**: Seamless export to user's Drive with proper authentication
- 🔗 **JIRA Direct Integration**: Create issues directly in JIRA
- 📊 **Advanced Analytics**: Test coverage metrics and compliance dashboards
- 👥 **Team Collaboration**: Share and collaborate on test cases
- 🎯 **Custom Test Templates**: Create reusable templates for common scenarios

### v3.0 - Enterprise Features (Q3 2025)
- 🤖 **Fine-tuned Healthcare Models**: Specialized models for specific healthcare domains
- 🏥 **EHR System Integration**: Direct integration with Epic, Cerner, Allscripts
- 📈 **Real-time Collaboration**: Multi-user editing and commenting
- 🔐 **Advanced Security**: SSO, RBAC, and audit logs
- 🌍 **Multi-language Support**: Generate test cases in multiple languages

### Future Considerations
- **Batch Processing**: Upload and process multiple documents simultaneously
- **Test Execution Integration**: Connect with Selenium, Cypress for automated testing
- **Requirement Traceability Matrix**: Link requirements to test cases automatically
- **AI-Powered Test Maintenance**: Auto-update test cases when requirements change

## Project Structure

```
MedTestAI/
├── server.js              # Express API server
├── package.json           # Backend dependencies
├── Dockerfile             # Container configuration
├── .gcloudignore          # Cloud deployment config
├── frontend/              # React application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── config.js      # API configuration
│   │   └── App.js         # Main app
│   ├── public/            # Static assets
│   └── package.json       # Frontend dependencies
├── services/              # Backend services
│   ├── geminiService.js   # Gemini AI integration
│   └── documentProcessor.js # Document handling
├── demo_results/          # Example generated tests
├── test-documents/        # Sample requirements docs
└── README.md             # This file
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

- **Cloud Run**: Pay-per-request, scales to zero when idle
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

## Security & Compliance

- **No PHI Storage**: Stateless architecture, no data retention
- **HTTPS Only**: All communication encrypted in transit
- **API Key Security**: Environment variables, never in code
- **Compliance Aware**: Understands HIPAA, FDA, GDPR requirements
- **Audit Ready**: Structured test cases ready for compliance audits

## License

MIT License - See [LICENSE](LICENSE) file for details.

## Contact

**Developer:** Jannet Ekka  
**GitHub:** [@JannetEkka](https://github.com/JannetEkka)  
**Project:** [github.com/JannetEkka/MedTestAI](https://github.com/JannetEkka/MedTestAI)  
**Live Demo:** [pro-variety-472211-b9.web.app](https://pro-variety-472211-b9.web.app)

## Acknowledgments

- **Google Gemini AI**: For powerful language model capabilities
- **Google Cloud Platform**: For scalable infrastructure
- **Healthcare Community**: For domain expertise and feedback

---

**Built for Gen AI Exchange Hackathon 2025**  
*Transforming healthcare testing with AI*