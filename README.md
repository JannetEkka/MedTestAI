# MedTestAI Healthcare Testing Platform

AI-Powered Healthcare Testing & Compliance Platform that transforms requirements documents into HIPAA-compliant test cases using Google Gemini AI.

## 🏥 Features

- **AI-Powered Analysis**: Document requirement extraction using Gemini 2.0 Flash
- **HIPAA Compliance**: Built-in healthcare compliance validation
- **Multi-Methodology**: Support for Agile, Waterfall, and Hybrid approaches
- **Professional Exports**: CSV, JSON, and Excel format outputs
- **Real-time Processing**: Dynamic reprocessing with different parameters

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Google Gemini API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/JannetEkka/MedTestAI.git
cd MedTestAI
```

2. Install backend dependencies:
```bash
npm install
```

3. Install frontend dependencies:
```bash
cd frontend
npm install
cd ..
```

4. Set up environment variables:
```bash
# Create .env file in root directory
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_CLOUD_PROJECT=pro-variety-472211-b9
PORT=3001
```

5. Start the application:
```bash
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start
```

6. Open http://localhost:3000 in your browser

## 🔧 Usage

1. **Configure**: Select testing methodology and compliance framework
2. **Upload**: Upload healthcare requirements document (PDF, DOC, DOCX, TXT)
3. **Process**: AI analyzes and generates comprehensive test cases
4. **Export**: Download test cases in multiple formats
5. **Reprocess**: Change parameters and regenerate for same document

## 🏗️ Architecture

- **Frontend**: React 18 with modern hooks
- **Backend**: Node.js + Express API
- **AI**: Google Gemini 2.0 Flash API
- **File Processing**: Multer for healthcare document upload
- **Export**: Multi-format generation (CSV, JSON, Excel)

## 📊 Demo

[Link to demo video]

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Contact

- GitHub: [@JannetEkka](https://github.com/JannetEkka)
- Project Link: [https://github.com/JannetEkka/MedTestAI](https://github.com/JannetEkka/MedTestAI)

---

Built for Gen AI Exchange Hackathon 2025
```
