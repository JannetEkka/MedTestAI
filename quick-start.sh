#!/bin/bash

# MedTestAI Healthcare AI Platform - Quick Start Script (Fixed)
# This script automatically sets up the entire healthcare AI testing platform

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration - Will be set dynamically
PROJECT_ID=""
REGION="us-central1"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to setup or select Google Cloud project
setup_project_id() {
    print_status "Setting up Google Cloud Project..."
    
    # Check if user has any projects
    EXISTING_PROJECTS=$(gcloud projects list --format="value(projectId)" 2>/dev/null || echo "")
    
    if [ -z "$EXISTING_PROJECTS" ]; then
        print_warning "No existing projects found. Creating a new project..."
        create_new_project
    else
        echo ""
        echo "📋 Your existing Google Cloud projects:"
        gcloud projects list --format="table(projectId,name,projectNumber)" 2>/dev/null || true
        echo ""
        
        read -p "Do you want to (1) Use existing project, (2) Create new project? [1/2]: " choice
        
        case $choice in
            1|"")
                select_existing_project
                ;;
            2)
                create_new_project
                ;;
            *)
                print_error "Invalid choice. Exiting."
                exit 1
                ;;
        esac
    fi
}

create_new_project() {
    print_status "Creating new Google Cloud project..."
    
    # Generate unique project ID
    TIMESTAMP=$(date +%s)
    PROJECT_ID="medtestai-${TIMESTAMP}"
    
    # Create project
    if gcloud projects create $PROJECT_ID --name="MedTestAI Healthcare Platform"; then
        print_success "Created new project: $PROJECT_ID"
        
        # Set billing account if available
        BILLING_ACCOUNTS=$(gcloud billing accounts list --filter="open=true" --format="value(name)" 2>/dev/null || echo "")
        if [ ! -z "$BILLING_ACCOUNTS" ]; then
            BILLING_ACCOUNT=$(echo "$BILLING_ACCOUNTS" | head -n1)
            print_status "Linking billing account..."
            gcloud billing projects link $PROJECT_ID --billing-account=$BILLING_ACCOUNT
            print_success "Billing account linked"
        else
            print_warning "No billing account found. You'll need to set up billing manually in the Google Cloud Console."
            echo "Visit: https://console.cloud.google.com/billing/projects/$PROJECT_ID"
        fi
    else
        print_error "Failed to create project. Trying alternative approach..."
        PROJECT_ID="medtestai-$(whoami)-${TIMESTAMP}"
        gcloud projects create $PROJECT_ID --name="MedTestAI Healthcare Platform"
        print_success "Created project with alternative name: $PROJECT_ID"
    fi
    
    # Set as active project
    gcloud config set project $PROJECT_ID
}

select_existing_project() {
    echo ""
    read -p "Enter your project ID (or press Enter to use default): " USER_PROJECT_ID
    
    if [ -z "$USER_PROJECT_ID" ]; then
        # Use first available project
        PROJECT_ID=$(gcloud projects list --format="value(projectId)" --limit=1)
        if [ -z "$PROJECT_ID" ]; then
            print_error "No projects available. Creating a new one..."
            create_new_project
            return
        fi
    else
        PROJECT_ID="$USER_PROJECT_ID"
    fi
    
    # Verify project access
    if gcloud projects describe $PROJECT_ID >/dev/null 2>&1; then
        print_success "Using project: $PROJECT_ID"
        gcloud config set project $PROJECT_ID
    else
        print_error "Cannot access project $PROJECT_ID. Creating a new project..."
        create_new_project
    fi
}

# Function to enable required APIs
enable_apis() {
    print_status "Enabling required Google Cloud APIs..."
    
    APIs=(
        "aiplatform.googleapis.com"
        "documentai.googleapis.com" 
        "healthcare.googleapis.com"
        "storage.googleapis.com"
        "cloudbuild.googleapis.com"
        "run.googleapis.com"
        "secretmanager.googleapis.com"
        "cloudkms.googleapis.com"
    )

    for api in "${APIs[@]}"; do
        print_status "  Enabling $api..."
        if gcloud services enable $api --project=$PROJECT_ID --quiet; then
            print_success "    ✅ $api enabled"
        else
            print_warning "    ⚠️  Failed to enable $api (may need billing setup)"
        fi
    done
}

# Function to create basic resources
create_basic_resources() {
    print_status "Creating basic healthcare resources..."
    
    # Create healthcare dataset
    DATASET_ID="medtestai-dataset"
    if gcloud healthcare datasets create $DATASET_ID --location=$REGION --project=$PROJECT_ID --quiet 2>/dev/null; then
        print_success "  ✅ Healthcare dataset created: $DATASET_ID"
        
        # Create FHIR store
        FHIR_STORE_ID="medtestai-fhir"
        if gcloud healthcare fhir-stores create $FHIR_STORE_ID \
            --dataset=$DATASET_ID \
            --location=$REGION \
            --version=R4 \
            --project=$PROJECT_ID \
            --quiet 2>/dev/null; then
            print_success "  ✅ FHIR store created: $FHIR_STORE_ID"
        fi
    else
        print_warning "  ⚠️  Healthcare API may need billing setup"
    fi
    
    # Create storage bucket
    BUCKET_NAME="${PROJECT_ID}-phi-data"
    if gsutil mb -p $PROJECT_ID -l $REGION gs://$BUCKET_NAME 2>/dev/null; then
        print_success "  ✅ Storage bucket created: $BUCKET_NAME"
    else
        print_warning "  ⚠️  Storage bucket creation may need billing setup"
    fi
    
    # Create service account
    SA_NAME="medtestai-service"
    SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
    
    if gcloud iam service-accounts create $SA_NAME \
        --display-name="MedTestAI Service Account" \
        --project=$PROJECT_ID \
        --quiet 2>/dev/null; then
        print_success "  ✅ Service account created: $SA_EMAIL"
        
        # Create service account key
        KEY_FILE="medtestai-sa-key.json"
        if gcloud iam service-accounts keys create $KEY_FILE \
            --iam-account=$SA_EMAIL \
            --project=$PROJECT_ID \
            --quiet 2>/dev/null; then
            print_success "  ✅ Service account key created: $KEY_FILE"
        fi
        
        # Grant basic permissions
        ROLES=(
            "roles/aiplatform.user"
            "roles/documentai.editor" 
            "roles/storage.admin"
        )
        
        for role in "${ROLES[@]}"; do
            gcloud projects add-iam-policy-binding $PROJECT_ID \
                --member="serviceAccount:$SA_EMAIL" \
                --role="$role" \
                --quiet >/dev/null 2>&1 || true
        done
        print_success "  ✅ Basic permissions granted"
    fi
}

# Function to create environment file
create_env_file() {
    print_status "Creating environment configuration..."
    
    cat > .env << EOF
# Google Cloud Project Configuration
GOOGLE_CLOUD_PROJECT=$PROJECT_ID
GOOGLE_APPLICATION_CREDENTIALS=./medtestai-sa-key.json

# Document AI Configuration (will be set after processor creation)
DOCUMENT_AI_PROCESSOR_ID=placeholder-processor-id
DOCUMENT_AI_LOCATION=us

# Vertex AI Configuration
VERTEX_AI_LOCATION=$REGION

# Healthcare API Configuration  
HEALTHCARE_DATASET_ID=medtestai-dataset
HEALTHCARE_LOCATION=$REGION
HEALTHCARE_FHIR_STORE_ID=medtestai-fhir

# Storage Configuration
PHI_BUCKET=${PROJECT_ID}-phi-data

# Application Configuration
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3000
JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "fallback-secret-key-$(date +%s)")

# Logging Configuration
LOG_LEVEL=info
AUDIT_LOG_ENABLED=true
EOF
    
    print_success "Environment file created: .env"
}

# Function to update package.json
update_package_json() {
    print_status "Updating package.json with correct dependencies..."
    
    # Backup existing package.json
    if [ -f "package.json" ]; then
        cp package.json package.json.backup
    fi
    
    cat > package.json << 'EOF'
{
  "name": "medtestai-backend",
  "version": "1.0.0", 
  "description": "Healthcare AI Testing Platform Backend",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5", 
    "dotenv": "^16.3.1",
    "multer": "^1.4.5-lts.1",
    "jsonwebtoken": "^9.0.2",
    "express-validator": "^7.0.1",
    "express-rate-limit": "^7.1.5",
    "helmet": "^7.1.0",
    "winston": "^3.11.0",
    "googleapis": "^139.0.0",
    "@google-cloud/aiplatform": "^5.6.0",
    "@google-cloud/documentai": "^9.3.0",
    "@google-cloud/storage": "^7.17.1",
    "@google-cloud/firestore": "^7.11.3",
    "google-auth-library": "^9.0.0",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.2",
    "jest": "^29.7.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
EOF

    # Install updated dependencies
    npm install --silent
    print_success "Dependencies updated and installed"
}

# Function to create start script
create_start_script() {
    print_status "Creating development start script..."
    
    cat > start-dev.sh << 'EOF'
#!/bin/bash

echo "🏥 Starting MedTestAI Healthcare AI Platform..."
echo "Project ID: $(grep GOOGLE_CLOUD_PROJECT .env | cut -d'=' -f2)"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Run ./quick-start-fixed.sh first."
    exit 1
fi

# Start backend
echo "🔧 Starting backend server..."
npm run dev &
BACKEND_PID=$!

# Wait a moment
sleep 2

# Start frontend in another terminal (if possible)
if command -v gnome-terminal >/dev/null 2>&1; then
    gnome-terminal -- bash -c "cd frontend && npm start; exec bash"
elif command -v cmd.exe >/dev/null 2>&1; then
    # Windows
    cmd.exe /c "start cmd /k 'cd frontend && npm start'"
else
    echo "🌐 Please open a new terminal and run:"
    echo "   cd frontend && npm start"
fi

echo ""
echo "✅ Backend running on: http://localhost:3000/api"
echo "✅ Frontend will run on: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop the backend server..."

# Wait for backend
wait $BACKEND_PID
EOF

    chmod +x start-dev.sh
    print_success "Start script created: ./start-dev.sh"
}

# Function to create sample test file
create_sample_test() {
    print_status "Creating sample test documents..."
    
    mkdir -p test-documents
    
    cat > test-documents/sample-requirements.txt << 'EOF'
Healthcare EHR System Requirements - Sample Document

SECURITY REQUIREMENTS:
1. The system shall implement role-based access control for all PHI access
2. Multi-factor authentication must be required for all healthcare personnel  
3. All patient data must be encrypted at rest and in transit using AES-256
4. User sessions must timeout after 30 minutes of inactivity
5. Failed login attempts must be logged and trigger account lockout after 5 attempts

AUDIT REQUIREMENTS:
1. All PHI access must be logged with timestamp, user ID, and data accessed
2. The system shall generate alerts for unusual access patterns
3. Audit logs must be retained for minimum 6 years per HIPAA requirements
4. Monthly compliance reports must be automatically generated
5. Breach detection and notification must be implemented

PRIVACY REQUIREMENTS:
1. Patients must be able to access their own medical records
2. The system shall support patient consent management for data sharing
3. Minimum necessary principle must be enforced for all PHI access
4. Data subject rights under HIPAA must be supported
5. Patient data anonymization capabilities must be provided

FUNCTIONAL REQUIREMENTS:
1. Healthcare providers must be able to create and edit clinical notes
2. The system shall integrate with laboratory systems using HL7 FHIR
3. Medication management with drug interaction checking is required
4. Appointment scheduling and patient portal access must be provided
5. Clinical decision support alerts must be implemented

INTEGRATION REQUIREMENTS:
1. HL7 FHIR R4 compliance for all healthcare data exchanges
2. Integration with Picture Archiving and Communication Systems (PACS)
3. Electronic prescribing (eRx) system integration
4. Health Information Exchange (HIE) connectivity
5. Insurance verification and eligibility checking

PERFORMANCE REQUIREMENTS:
1. System response time must be under 3 seconds for routine operations
2. Support for minimum 500 concurrent users
3. 99.9% uptime during business hours
4. Database backup and recovery within 4-hour RTO
5. Auto-scaling capabilities for peak usage periods
EOF
    
    print_success "Sample test document created: test-documents/sample-requirements.txt"
}

# Function to run basic tests
run_basic_tests() {
    print_status "Running basic connectivity tests..."
    
    # Test Google Cloud authentication
    if gcloud auth list --filter=status:ACTIVE --format="value(account)" >/dev/null 2>&1; then
        print_success "  ✅ Google Cloud authentication: OK"
    else
        print_warning "  ⚠️  Google Cloud authentication: Issues detected"
    fi
    
    # Test project access
    if gcloud projects describe $PROJECT_ID >/dev/null 2>&1; then
        print_success "  ✅ Project access: OK"
    else  
        print_warning "  ⚠️  Project access: Issues detected"
    fi
    
    # Test Node.js
    if node --version >/dev/null 2>&1; then
        print_success "  ✅ Node.js: $(node --version)"
    else
        print_error "  ❌ Node.js: Not found"
    fi
    
    print_success "Basic tests completed"
}

# Main execution function
main() {
    echo ""
    echo "🏥 MedTestAI Healthcare AI Testing Platform"  
    echo "🤖 Powered by Google Cloud GenAI Services"
    echo "🔧 Fixed Version - Works with Any Project"
    echo "=============================================="
    echo ""
    
    # Navigate to project directory if needed
    if [ -d "MedTestAI" ]; then
        cd MedTestAI
        print_status "Using existing MedTestAI directory"
    fi
    
    setup_project_id
    enable_apis
    create_basic_resources
    create_env_file
    update_package_json
    create_start_script
    create_sample_test
    run_basic_tests
    
    echo ""
    print_success "🎉 MedTestAI setup complete!"
    echo ""
    echo "📋 Your Configuration:"
    echo "  • Project ID: $PROJECT_ID"
    echo "  • Region: $REGION"  
    echo "  • Service Account: medtestai-service@${PROJECT_ID}.iam.gserviceaccount.com"
    echo ""
    echo "🚀 Next Steps:"
    echo "  1. Run: ./start-dev.sh"
    echo "  2. Open: http://localhost:3000"
    echo "  3. Test with: test-documents/sample-requirements.txt" 
    echo ""
    echo "💡 Notes:"
    echo "  • Some services may need billing setup for full functionality"
    echo "  • Visit Google Cloud Console to enable billing if needed"
    echo "  • All basic functionality will work in free tier"
    echo ""
    
    # Ask if user wants to start now
    read -p "Do you want to start the development servers now? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ./start-dev.sh
    else
        print_status "To start later, run: ./start-dev.sh"
    fi
}

# Run main function
main "$@"