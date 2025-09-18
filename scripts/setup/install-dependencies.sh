#!/bin/bash
echo "Installing MedTestAI dependencies..."

# Install Node.js dependencies
npm install

# Install Python dependencies
cd ml
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Install spaCy models
python -m spacy download en_core_web_sm
python -m spacy download en_core_sci_sm

echo "Dependencies installed successfully!"
