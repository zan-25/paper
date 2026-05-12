# QPGen: AI Question Paper Generator

A modern, AI-powered system for generating institutional question papers with automated Bloom's Taxonomy (RBT) mapping and Course Outcome (CO) tracking.

## 🏗️ Project Structure

- **`/frontend`**: React + Vite frontend application.
- **`/backend`**: FastAPI backend with Ollama AI integration.
- **`/docs`**: Documentation, templates, and project references.
- **`/lib`**: Shared libraries and API client.
- **`/scripts`**: Utility scripts for development and deployment.

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** (v18+)
- **pnpm** (v8+)
- **Python** (v3.10+)
- **Ollama** (with `llama3.2-vision` model)

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

### 3. Frontend Setup
```bash
cd frontend/qp-maker
pnpm install
pnpm run dev
```

## 🛠️ Key Features
- **AI-Powered Extraction**: Automatically extract questions from uploaded PDF/DOCX question banks.
- **Institutional Alignment**: Maps questions to Course Outcomes and Bloom's Levels.
- **Review Workflow**: Multi-tier approval system for HODs and Administrators.
- **DOCX Export**: High-fidelity export matching institutional templates.

## 📝 License
MIT
