# ClinSight AI — Project Documentation

## 1. Project Overview

ClinSight AI is a healthcare intelligence platform designed to help doctors and patients make faster, safer, and more informed clinical decisions. The project combines patient data, AI agents, clinical rationale, RAG-based querying, and blockchain-style audit logging into one integrated system.

The platform is built to support:
- Doctor dashboards with patient summaries and alerts
- AI-assisted clinical triage and second opinions
- Intelligent patient communication and nutrition guidance
- OCR-based ingestion of medical documents
- WhatsApp-based assistant flows
- Audit logging for healthcare actions

This repository contains:
- [backend1](backend1) — Express.js backend with AI agents and MongoDB integration
- [frontend](frontend) — Next.js frontend dashboard and patient portal
- [README.md](README.md) — project-level summary and setup guidance

---

## 2. Problem the Project Solves

Healthcare teams often work with fragmented patient information spread across:
- visit notes
- prescriptions
- lab reports
- drug histories
- diagnosis records

Doctors typically spend effort manually preparing summaries before appointments. This creates delays and increases the risk of missing:
- repeated or overdue tests
- dangerous drug interactions
- deteriorating trends in vitals or labs
- missing specialist referrals
- poor communication for patients

ClinSight aims to close this gap by automatically creating a structured clinical picture and surfacing risk indicators before consultation.

---

## 3. Project Objectives

- Build a doctor-facing intelligence dashboard
- Provide patient-specific AI summaries
- Detect and flag critical clinical patterns
- Offer second-opinion support for proposed diagnoses
- Support referral and handoff workflows
- Log healthcare operations with a tamper-friendly ledger
- Give patients a simple portal for summaries, reminders, and advice
- Support document ingestion and conversational chat

---

## 4. Main Solution Architecture

The system has two primary application layers:

1. Frontend Layer
   - Built with Next.js and React
   - Displays dashboard, patient records, AI chat, auth flows, and report pages

2. Backend Layer
   - Built with Node.js and Express
   - Handles REST API routes, AI orchestration, data access, uploads, session logic, and Socket.IO events

The backend is designed around a multi-agent architecture, where specialist agents run based on query type or workflow requirement.

---

## 5. Tech Stack

### Frontend
- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Shadcn-style component library
- Recharts for charts
- Radix UI primitives
- Lucide icons
- React Hook Form + Zod for form validation

Primary frontend config is in:
- [frontend/package.json](frontend/package.json)
- [frontend/app](frontend/app)
- [frontend/components](frontend/components)

### Backend
- Node.js
- Express.js
- MongoDB with MongoDB Node driver
- Socket.IO
- Multer for file uploads
- Tesseract.js for OCR
- Vectra for vector store/search capabilities
- OpenAI / Anthropic / Google / Groq SDKs
- Twilio for WhatsApp integration
- Helmet and CORS for security middleware
- dotenv for environment management

Primary backend config is in:
- [backend1/package.json](backend1/package.json)
- [backend1/server.js](backend1/server.js)
- [backend1/app.js](backend1/app.js)

### Data and Knowledge Layer
- Local JSON datasets under [backend1/data](backend1/data)
- MongoDB Atlas support for persistent patient and healthcare data
- Vector index folder under [backend1/data/vectra_index](backend1/data/vectra_index)
- Clinical guidelines and drug interaction knowledge datasets

---

## 6. Folder Structure Overview

### Backend Structure
- [backend1/agents](backend1/agents) — AI agents for analysis, triage, nutrition, reception, ingestion, OCR, transfer, second opinion, orchestration
- [backend1/routes](backend1/routes) — REST endpoint definitions
- [backend1/repositories](backend1/repositories) — data abstraction and repository logic
- [backend1/rag](backend1/rag) — vector index and patient context logic
- [backend1/data](backend1/data) — source datasets and patient records
- [backend1/blockchain](backend1/blockchain) — blockchain-like logging system
- [backend1/uploads](backend1/uploads) — uploaded patient documents
- [backend1/tests](backend1/tests) — backend verification tests
- [backend1/scripts](backend1/scripts) — seeding and setup scripts

### Frontend Structure
- [frontend/app](frontend/app) — screens for dashboard, auth, landing, and patient views
- [frontend/components](frontend/components) — UI elements and page-specific sections
- [frontend/lib](frontend/lib) — API wrappers and support utilities
- [frontend/hooks](frontend/hooks) — custom hooks

---

## 7. Core Features

### 7.1 Doctor Dashboard
The doctor-facing portal allows clinicians to:
- view patient lists
- open patient histories
- review summaries and care gaps
- inspect abnormal labs and alerts
- see visit activity
- trigger AI-driven clinical analysis
- provide second-opinion guidance
- start specialist referrals
- monitor audit events

This is implemented in the frontend dashboard flow and backend dashboard route service.

### 7.2 Clinical AI Summary Generation
The backend exposes summary generation logic that prepares quick patient context, including:
- age and demographics
- current diagnoses
- medications
- active alerts
- last visit details
- recommended next steps

This is available through a patient summary flow in the assistant routes.

### 7.3 Triage and Risk Detection
The system classifies patient situations into priority levels such as:
- CRITICAL
- HIGH
- MEDIUM
- LOW

This logic is implemented through the triage agent and patient bagging logic. It supports early escalation when a patient has clinically urgent issues.

### 7.4 Drug Interaction Review
The backend tracks medication data and checks against interaction knowledge, enabling safety warnings where dangerous combinations or contraindications may exist.

### 7.5 Second Opinion Agent
This feature allows a doctor to propose a diagnosis and ask the system to compare it against the patient’s history, trends, and records. It is designed to return:
- agreement or contradiction
- evidence-backed reasoning
- confidence score

### 7.6 Referral / Transfer Agent
The transfer agent helps route patients to relevant departments or consultants by generating a handoff summary with the relevant clinical context.

### 7.7 OCR and Document Parsing
The OCR agent processes uploaded documents using Tesseract.js to interpret scanned text and convert it into structured medical information. This is crucial for prescriptions, test reports, and discharge notes.

### 7.8 Nutrition Guidance
The nutrition agent takes patient condition details and food-related prompts to generate dietary guidance in a health-aware context.

### 7.9 Receptionist and Chat Assistant
The receptionist agent supports a conversational assistant for:
- appointment booking guidance
- department information
- patient questions
- hospital contact support
- triage-style live support

### 7.10 WhatsApp Bot
The project includes WhatsApp automation using Twilio for:
- doctor queries
- patient support scenarios
- appointment or hospital navigation guidance
- summary requests and AI-generated responses

### 7.11 Blockchain-Style Audit Trail
The system includes a custom blockchain logger in [backend1/blockchain/logger.js](backend1/blockchain/logger.js). It records actions as blocks with metadata including:
- event type
- actor
- patient ID
- timestamp
- hash-linked chain

This supports visibility into actions and accountability for clinical operations.

### 7.12 Vector-Based Retrieval for Context
The RAG logic loads patient information and related knowledge into a searchable vector index. This allows the assistant to answer questions using patient context and retrieved evidence instead of only prompting a generic LLM.

---

## 8. AI Agent Modules

The project contains several specialized agents in [backend1/agents](backend1/agents):

- analysisAgent.js — clinical reasoning and pattern detection
- triageAgent.js — risk and priority classification
- secondOpinionAgent.js — diagnosis validation and evidence comparison
- transferAgent.js — specialist referral / handoff summary
- receptionistAgent.js — patient support communication
- nutritionAgent.js — personalised diet guidance
- ocrAgent.js — text extraction from uploaded images/docs
- ingestionAgent.js — data ingestion and extraction workflows
- orchestratorAgent.js — workflow coordination and agent chain management
- ragDoctorAgent.js — RAG-based doctor queries and patient summarisation

These agents compose the “AI clinical operation layer” that sits between the API and the healthcare data store.

---

## 9. Backend API Design

The backend exposes routes for:
- assistant queries
- patient summaries
- second opinion reviews
- triage requests
- receptionist chat
- nutrition advice
- dashboard data
- patient creation and listing
- WhatsApp interactions
- authentication endpoints

Key route files:
- [backend1/routes/assistant.js](backend1/routes/assistant.js)
- [backend1/routes/dashboard.js](backend1/routes/dashboard.js)
- [backend1/routes/patients.js](backend1/routes/patients.js)
- [backend1/routes/auth.js](backend1/routes/auth.js)
- [backend1/routes/whatsapp.js](backend1/routes/whatsapp.js)

Main API flow:
- client sends request to /api/assistant or /api/patients
- backend validates and normalizes input
- relevant AI agent or repository layer runs
- result is returned as JSON
- blockchain event is logged if relevant
- websocket event is emitted for UI updates

---

## 10. Data Model and Sources

The backend operates on both local and MongoDB-backed data.

### Local data files
- [backend1/data/clinical_guidelines.json](backend1/data/clinical_guidelines.json)
- [backend1/data/drug_interactions.json](backend1/data/drug_interactions.json)
- [backend1/data/lab_test_orders.json](backend1/data/lab_test_orders.json)
- [backend1/data/patient_P001.json](backend1/data/patient_P001.json)
- [backend1/data/patient_P002.json](backend1/data/patient_P002.json)
- [backend1/data/patient_P010.json](backend1/data/patient_P010.json)
- [backend1/data/prescriptions.json](backend1/data/prescriptions.json)
- [backend1/data/users.json](backend1/data/users.json)

### Structured data used by dashboard
- patients
- visits
- medications
- labs
- alerts
- diagnoses
- allergies
- doctor notes

### MongoDB support
The backend supports Atlas configuration using environment variables. It can connect to a cloud database and ingest patient data for live operations.

---

## 11. Security, Session, and Access Control

The application includes:
- CORS configuration
- Helmet middleware for baseline security hardening
- session-based auth checks in the backend
- front-end authenticated dashboard gating
- environment variables for registration codes and cookies

These behaviors are visible in:
- [backend1/app.js](backend1/app.js)
- [backend1/services/authService.js](backend1/services/authService.js)
- [backend1/routes/auth.js](backend1/routes/auth.js)

---

## 12. Environment Configuration

### Backend environment
Required and optional values are shown in:
- [backend1/.env.example](backend1/.env.example)

Key variables include:
- PORT
- FRONTEND_URL
- DOCTOR_REGISTRATION_CODE
- AUTH_COOKIE_DOMAIN
- MONGODB_URI / MONGO_URI
- MONGO_DB_NAME
- OPENAI_API_KEY
- ANTHROPIC_API_KEY
- GOOGLE_API_KEY

### Frontend environment
Defined in:
- [frontend/.env.local.example](frontend/.env.local.example)

Key variable:
- NEXT_PUBLIC_BACKEND_URL

---

## 13. Run and Development Instructions

### Backend
```bash
cd backend1
npm install
cp .env.example .env
npm run dev
```

### Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

### Access URLs
- Frontend: http://localhost:3000
- Backend: http://localhost:4000

---

## 14. Unique Product Value

This project is not just a simple dashboard. It combines:
- healthcare records
- AI reasoning workflow
- retrieval-augmented generation
- clinician triage support
- patient communication
- operational audit trail
- responsive healthcare UX

This makes it a strong healthcare AI product prototype rather than a generic chatbot or data viewer.

---

## 15. Project Strengths

- Full-stack integration between frontend and backend
- Multi-agent architecture for specialized tasks
- Uses real clinical datasets and patient data patterns
- Provides both doctor and patient experiences
- Includes blockchain-style accountability layer
- Supports both web and WhatsApp-driven user journeys
- Has a modular and extensible structure for future expansion

---

## 16. Current Limitations and Risks

- Some features are prototype-driven and depend on external API keys
- AI behavior depends on model quality and prompt structure
- Real-world clinical deployment would require stronger validation, governance, and compliance review
- Security and data privacy need stricter hardening before production healthcare use
- MongoDB and Atlas configuration must be prepared correctly for persistence

---

## 17. Suggested Future Improvements

- Add role-based access control for doctors, nurses, and admins
- Add stronger patient consent and privacy controls
- Add advanced lab trend analytics and machine learning risk prediction
- Add EMR interoperability with hospital systems
- Add more robust disease-specific clinical protocols
- Add monitoring dashboards for model quality and safety
- Add deployment automation and CI/CD

---

## 18. Final Summary

ClinSight AI is a healthcare intelligence platform that blends AI agents, clinical data, patient portals, and audit logging to deliver a more proactive and safer medical workflow. It includes both doctor and patient experiences, supports real-time summarization, risk detection, referrals, and conversational assistance, and is structured as a practical prototype for healthcare AI product development.

The project is a strong example of a multi-layered AI application combining:
- frontend UX
- server-side orchestration
- clinical data modeling
- retrieval augments
- LLM-powered workflows
- secure back-end integration

That makes it a strong candidate for expansion into a production-grade clinical decision support platform.
