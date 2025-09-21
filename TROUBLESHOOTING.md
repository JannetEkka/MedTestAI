# MedTestAI Troubleshooting Guide

## 🚨 **Common Issues and Solutions**

### 1. **Google Cloud Authentication Issues**

#### Problem: `Error: Could not load the default credentials`
**Solution:**
```bash
# Re-authenticate with Google Cloud
gcloud auth application-default login

# Verify service account key exists
ls -la medtestai-sa-key.json

# Set environment variable explicitly
export GOOGLE_APPLICATION_CREDENTIALS="./medtestai-sa-key.json"
```

#### Problem: `403 Forbidden` when accessing APIs
**Solution:**
```bash
# Check if APIs are enabled
gcloud services list --enabled --filter="aiplatform.googleapis.com OR documentai.googleapis.com OR healthcare.googleapis.com"

# Enable missing APIs
gcloud services enable aiplatform.googleapis.com documentai.googleapis.com healthcare.googleapis.com

# Verify IAM permissions
gcloud projects get-iam-policy pro-variety-472211-b9 --flatten="bindings[].members" --filter="bindings.members:medtestai-github-actions@pro-variety-472211-b9.iam.gserviceaccount.com"
```

### 2. **Document AI Processing Failures**

#### Problem: `Processor not found` error
**Solution:**
```bash
# List available processors
gcloud ai document-ai processors list --location=us

# Create new processor if needed
gcloud ai document-ai processors create \
  --location=us \
  --display-name="MedTestAI Form Parser" \
  --type=FORM_PARSER_PROCESSOR

# Update DOCUMENT_AI_PROCESSOR_ID in .env file
```

#### Problem: Document processing returns empty results
**Solution:**
```bash
# Check file format support
# Supported formats: PDF, TIFF, GIF, JPEG, PNG, BMP, WEBP
# Max file size: 20MB per document

# Test with a simple PDF first
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth application-default print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "rawDocument": {
      "content": "'$(base64 -w 0 sample.pdf)'",
      "mimeType": "application/pdf"
    }
  }' \
  "https://us-documentai.googleapis.com/v1/projects/pro-variety-472211-b9/locations/us/processors/YOUR_PROCESSOR_ID:process"
```

### 3. **Vertex AI / Gemini API Issues**

#### Problem: `Model not found` or `Endpoint not available`
**Solution:**
```bash
# List available models
gcloud ai models list --region=us-central1

# Create Vertex AI endpoint
gcloud ai endpoints create \
  --display-name=medtestai-healthcare-endpoint \
  --region=us-central1

# Check quota limits
gcloud ai models list --region=us-central1 --filter="displayName:gemini"

# For Gemini API, verify the model name
# Use 'gemini-pro' instead of 'gemini-2.5-flash' if needed
```

#### Problem: High token costs or rate limiting
**Solution:**
```javascript
// Optimize prompts to reduce token usage
const optimizedPrompt = `
Generate 5 healthcare test cases for: ${requirement}
Format: JSON with id, title, steps, expected result
Focus on HIPAA compliance
`;

// Implement caching for repeated requests
const cache = new Map();
const cacheKey = `${requirements.join('|')}_${methodology}`;
if (cache.has(cacheKey)) {
  return cache.get(cacheKey);
}
```

### 4. **Frontend Build and Runtime Issues**

#### Problem: Module not found errors
**Solution:**
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# For React specific issues
cd frontend
rm -rf node_modules package-lock.json
npm install
npm audit fix
```

#### Problem: CORS errors when connecting to backend
**Solution:**
```javascript
// Update backend CORS configuration in server.js
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://your-frontend-domain.com',
    'https://your-firebase-app.web.app'
  ],
  credentials: true
}));
```

### 5. **Healthcare Dataset Issues**

#### Problem: FHIR store access denied
**Solution:**
```bash
# Verify healthcare dataset exists
gcloud healthcare datasets describe medtestai-dataset --location=us-central1

# Check FHIR store permissions
gcloud healthcare fhir-stores get-iam-policy medtestai-fhir \
  --dataset=medtestai-dataset \
  --location=us-central1

# Grant necessary permissions
gcloud healthcare fhir-stores add-iam-policy-binding medtestai-fhir \
  --dataset=medtestai-dataset \
  --location=us-central1 \
  --member="serviceAccount:medtestai-github-actions@pro-variety-472211-b9.iam.gserviceaccount.com" \
  --role="roles/healthcare.fhirResourceEditor"
```

### 6. **File Upload Issues**

#### Problem: Large files fail to upload
**Solution:**
```javascript
// Increase file size limits in server.js
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Update multer configuration
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 100 * 1024 * 1024, // 100MB
    fieldSize: 100 * 1024 * 1024 
  }
});
```

#### Problem: File type validation errors
**Solution:**
```javascript
// Update file filter in DocumentUpload.js
const allowedTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/rtf'
];

// Add MIME type detection
const fileType = require('file-type');
const detectedType = await fileType.fromBuffer(file.buffer);
```

## 🔍 **Debugging Tools**

### Enable Debug Logging

```javascript
// Add to server.js for detailed logging
const winston = require('winston');
const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.prettyPrint()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'debug.log' })
  ]
});

// Log all API requests
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.path}`, {
    body: req.body,
    headers: req.headers,
    query: req.query
  });
  next();
});
```

### Test Individual Components

```javascript
// Test Document AI independently
const testDocumentAI = async () => {
  const client = new DocumentProcessorServiceClient();
  const processorName = `projects/${PROJECT_ID}/locations/us/processors/${PROCESSOR_ID}`;
  
  try {
    const [result] = await client.processDocument({
      name: processorName,
      rawDocument: {
        content: fs.readFileSync('test-document.pdf').toString('base64'),
        mimeType: 'application/pdf'
      }
    });
    console.log('Document AI Test:', result.document.text.substring(0, 100));
  } catch (error) {
    console.error('Document AI Error:', error);
  }
};

// Test Vertex AI independently  
const testVertexAI = async () => {
  const client = new PredictionServiceClient();
  const endpoint = `projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/gemini-pro`;
  
  try {
    const [response] = await client.predict({
      endpoint,
      instances: [{
        prompt: 'Generate a simple healthcare test case',
        parameters: { temperature: 0.2, maxOutputTokens: 100 }
      }]
    });
    console.log('Vertex AI Test:', response.predictions[0]);
  } catch (error) {
    console.error('Vertex AI Error:', error);
  }
};
```

## 📊 **Performance Monitoring**

### Add Performance Metrics

```javascript
// Add to server.js
const responseTime = require('response-time');

app.use(responseTime((req, res, time) => {
  logger.info('Request Performance', {
    method: req.method,
    url: req.url,
    responseTime: `${time}ms`,
    statusCode: res.statusCode
  });
}));

// Monitor memory usage
const monitorMemory = () => {
  const used = process.memoryUsage();
  logger.info('Memory Usage', {
    rss: `${Math.round(used.rss / 1024 / 1024 * 100) / 100} MB`,
    heapTotal: `${Math.round(used.heapTotal / 1024 / 1024 * 100) / 100} MB`,
    heapUsed: `${Math.round(used.heapUsed / 1024 / 1024 * 100) / 100} MB`
  });
};

setInterval(monitorMemory, 30000); // Monitor every 30 seconds
```

## 🆘 **Getting Help**

### Error Reporting Template

When reporting issues, include:

```
**Environment:**
- Node.js version: 
- OS: 
- Browser: 

**Error Details:**
- Error message: 
- Stack trace: 
- Steps to reproduce: 

**Configuration:**
- Google Cloud Project ID: pro-variety-472211-b9
- Region: us-central1
- APIs enabled: 

**Logs:**
[Paste relevant log entries]
```

### Useful Diagnostic Commands

```bash
# System health check
node --version
npm --version
gcloud version

# Google Cloud connectivity
gcloud auth list
gcloud config list
gcloud projects describe pro-variety-472211-b9

# Service status
curl -I https://aiplatform.googleapis.com
curl -I https://documentai.googleapis.com

# Local development
npm audit
npm outdated
netstat -tlnp | grep :3000
```

### Contact Support

1. **GitHub Issues**: [Create Issue](https://github.com/JannetEkka/MedTestAI/issues/new)
2. **Google Cloud Support**: Use Cloud Console support tab
3. **Community**: Stack Overflow with tags `google-cloud-platform` + `healthcare-ai`

Remember: Never include PHI or sensitive healthcare data in error reports or logs!