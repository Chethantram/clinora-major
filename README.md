# GLITCHCON_team09 — Make it full-stack

This workspace contains multiple projects. The two main development targets are:

- `backend1` — Express-based Node.js backend (port 4000)
- `v0-hackathon-development-order` — Next.js frontend (port 3000)

Quick start (local):

1. Backend

```bash
cd backend1
cp .env.example .env
# edit .env and add MONGO_URI and any API keys you need

npm install
npm run dev
```

2. Frontend

```bash
cd v0-hackathon-development-order
cp .env.local.example .env.local
# adjust NEXT_PUBLIC_BACKEND_URL if your backend runs on a different host

npm install
npm run dev
```

3. Run both services together (optional)

```bash
# from the repository root
npm install
npm run install-all
npm run dev
```

This uses the root `package.json` to launch the backend and frontend concurrently for local development.

Notes:
- The frontend uses `NEXT_PUBLIC_BACKEND_URL` (see `.env.local.example`) to locate the backend API.
- The backend reads `FRONTEND_URL` to configure CORS and Socket.IO origin.
- Many backend features expect `MONGO_URI` and optional model/API keys; provide them in `backend1/.env` for full functionality.

If you want, I can:

- Add a root-level `package.json` with workspace scripts to run both concurrently.
- Add basic auth/session support.
- Wire example frontend pages to real backend endpoints.

Tell me which of the above you'd like next.# ClinSight AI – An Agentic AI Infrastructure Automating the End-to-End Experience for Doctors and Patients
# HackerRank GLITCHCON 2.0 – Track Winners (Healthcare AI)
<div align="center">

# ClinSight AI

### Clinical Intelligence, Accelerated

[![Groq](https://img.shields.io/badge/Powered%20by-Groq%20LLaMA%203.3%2070B-orange?style=flat-square)](https://console.groq.com)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-blue?style=flat-square)](https://vitejs.dev)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-green?style=flat-square)](https://nodejs.org)
[![Firebase](https://img.shields.io/badge/Auth-Firebase-yellow?style=flat-square)](https://firebase.google.com)
[![License](https://img.shields.io/badge/License-MIT-purple?style=flat-square)](LICENSE)

**Track Winners — Healthcare AI | HackerRank GLITCHCON 2.0**

**Sponsored by:
HackerRank · WeLe · ECDS · Kathir Memorial Hospital · Bitumen · Arpina Solutions · Mellon AI**

*Team offered internship by One of the Sponsors*

[Live Demo](https://clinsightai.vercel.app) · [Report Bug](https://github.com/sseth345/GLITCHCON_team09/issues)

</div>

---


## 👥 Team FANATICS

<table align="center">
<tr>
<td align="center"><img src="https://img.shields.io/badge/-Shreyash-FF6B6B?style=for-the-badge&logo=github&logoColor=white"></td>
<td align="center"><img src="https://img.shields.io/badge/-Siddharth-45B7D1?style=for-the-badge&logo=github&logoColor=white"></td>
<td align="center"><img src="https://img.shields.io/badge/-Meghna-FECA57?style=for-the-badge&logo=github&logoColor=white"></td>
</tr>
<tr>
<td align="center"><img src="https://img.shields.io/badge/-Dipsita-4ECDC4?style=for-the-badge&logo=github&logoColor=white"></td>
<td align="center"><img src="https://img.shields.io/badge/-Riddhi-96CEB4?style=for-the-badge&logo=github&logoColor=white"></td>
<td align="center"><img src="https://img.shields.io/badge/-Shreeya-FF9FF3?style=for-the-badge&logo=github&logoColor=white"></td>
</tr>
</table>

---

## The Problem

Physicians in busy hospitals manage hundreds of patients — each with dense, unstructured histories buried across visit logs, prescriptions, lab reports, and diagnostic notes. Before every consultation, the doctor has no structured summary. They walk in cold.

This leads to:
- Missed clinical patterns (worsening HbA1c over 7 visits goes unnoticed)
- Repeated lab orders for tests already done recently
- Drug interaction risks overlooked under time pressure
- Diagnostic errors from cognitive overload
- No audit trail — actions on patient records go unlogged

**There is no intelligent layer between the doctor and the data.**

---

## The Solution

ClinSight is a multi-agent clinical intelligence platform that deploys seven specialised AI agents to surface insights, detect risks, and assist both doctors and patients — all in real time.

When a doctor opens a patient record, the system automatically generates a 60-second brief, flags critical patterns, checks drug interactions, routes to the right specialist, and logs every action to an immutable blockchain — before the doctor types a single query.

Patients get their own portal: upload a prescription or lab report, get a structured health summary, personalised nutrition advice, overdue test reminders, and access to the hospital's AI receptionist — all from a browser or WhatsApp.

---

## Achievements

- **Track Winners — Healthcare AI** at GLITCHCON 2.0, VIT (24-hour hackathon)
- **Team offered internship** by one of the sponsors
- Industry partners: HackerRank · WeLe · ECDS · Kathir Memorial Hospital · Bitumen · Arpina Solutions · Mellon AI

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ClinSight Platform                       │
├──────────────────────────┬──────────────────────────────────────┤
│     Doctor Dashboard     │         Patient Portal               │
│   (React + Vite)         │         (React + Vite)               │
└──────────────┬───────────┴──────────────┬───────────────────────┘
               │                          │
               ▼                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Node.js + Express Backend                     │
│                    Socket.io (real-time feed)                    │
│                    Firebase Auth (Google OAuth)                  │
└───────────────────────────┬──────────────────────────────────────┘
                            │
            ┌───────────────▼────────────────┐
            │          Orchestrator          │
            │   (chains all agents, auto-    │
            │    escalates critical flags)   │
            └──┬────┬────┬────┬────┬────┬───┘
               │    │    │    │    │    │
     ┌─────────┘  ┌─┘  ┌─┘  ┌─┘  ┌─┘    └───────────┐
     ▼            ▼    ▼    ▼    ▼                  ▼
 Analysis     Triage   OCR  2nd  Transfer  Nutrition  Receptionist
  Agent        Agent  Agent Opin  Agent     Agent      Agent
               │           │         │                  │
               ▼           ▼         ▼                  ▼
         Specialty    Tesseract  Doctor-to-        Groq LLM
          Routing   + G.Vision   Doctor         (WhatsApp +
                               Handoff           Web chat)
                            │
                            ▼
               ┌────────────────────────┐
               │  Blockchain Audit Trail│
               │  SHA-256 hash-linked   │
               │  Immutable event log   │
               └────────────────────────┘
```

---

## Agent Pipeline — How They Interact

When a patient record is opened, the Orchestrator fires the following chain automatically:

| Step | Agent | Action | Trigger |
|------|-------|--------|---------|
| 1 | **Orchestrator** | Load patient case sheet, validate ID | Auto on page load |
| 2 | **Analysis Agent** | Run 7 tools in parallel: lab trends, drug check, flag detection, brief generation, overdue tests, history search, pharmacy links | Auto |
| 3 | **Triage Agent** | Map clinical flags to departments, assign priority (CRITICAL / HIGH / MEDIUM / LOW) | Auto |
| 4 | **Orchestrator** | Auto-raise ticket if CRITICAL flags found — no physician action needed | Conditional |
| 5 | **Blockchain Logger** | Log every step with SHA-256 hash — FULL_PIPELINE_RUN, TICKET_RAISED, LAB_RECOMMENDATION, GENERATE_BRIEF | Every action |
| 6 | **Second Opinion Agent** | Physician enters proposed diagnosis → agent scans history → verdict + confidence score | On demand |
| 7 | **Transfer Agent** | Doctor initiates referral → full handoff summary generated, risk assessed | On demand |
| 8 | **OCR Agent** | Patient uploads document → Tesseract/Google Vision extracts text → Groq structures data | On demand |
| 9 | **Nutrition Agent** | Patient describes food → condition-specific dietary analysis | On demand |
| 10 | **Receptionist Agent** | Patient asks question → multi-turn Groq conversation | On demand |

The Second Opinion Agent is the system's most complex feature — it scans a patient's full history, all lab trends, all visit notes, and drug interactions to either corroborate or contradict a proposed diagnosis, returning a confidence score from 0–100 with cited evidence.

---

## Key Features

### Doctor Dashboard
- **60-second pre-consultation brief** — auto-generated on patient select: diagnoses, meds, critical flags, allergies, recent labs
- **Interactive lab trend charts** — HbA1c, Creatinine, eGFR, BP, TSH, Haemoglobin with WORSENING/IMPROVING/STABLE indicators
- **Drug interaction detection** — checks all current medications against known interaction database, severity classified
- **Natural language query** — ask anything about a patient in plain English, powered by Groq
- **Second Opinion mode** — type a proposed diagnosis, get evidence-backed verdict with confidence score
- **One-click referral** — select department, the Transfer Agent auto-generates handoff summary, logs to blockchain
- **Live blockchain audit sidebar** — every action displayed as it happens with hash, timestamp, event type
- **Agent execution trace** — numbered pipeline steps visible in real time

### Patient Portal
- **Medical document upload** — prescriptions, lab reports, discharge summaries processed by OCR + Groq
- **Personalised health summary** — active diagnoses, current medications, clinical alerts
- **Overdue test reminders** — with direct 1mg and Thyrocare booking links
- **Nutrition analyser** — describe your meal in plain English, get advice specific to your conditions
- **AI Receptionist chatbot** — appointment booking (Calendly), departments, emergency contacts
- **Medication tracker** — with 1mg pharmacy integration for each medication

### WhatsApp Intelligence Bot
Dual-mode bot via Twilio — no app download required:

**Doctor flow** — type a patient ID to get:
```
1 - Pre-consultation brief
2 - Clinical flags (CRITICAL / HIGH)
3 - Medications with cautions
4 - Latest lab results
5 - Drug interactions
6 - Visit history
7 - Triage routing
8 - Ask AI (free-text Groq query)
```

**Patient flow** — type "hey" to access:
```
1 - Book appointment (Calendly link)
2 - Hospital info
3 - Departments
4 - Emergency (108 + direct line)
5 - Health summary (enter Patient ID)
6 - Ask AI receptionist (multi-turn)
```

### Blockchain Audit Trail
Every action in the system — record access, brief generation, drug check, OCR processing, ticket raises, referrals — is logged as a block in a custom SHA-256 linked chain. Blocks cannot be altered or deleted. The live feed is visible in real time on the Doctor Dashboard.

### Mobile App (Flutter)
A companion Flutter app provides mobile access to the patient portal with document upload, health summary, and AI receptionist features.

### Voice AI Integration
Voice-based query interface allowing hands-free clinical queries — built for situations where the doctor cannot type.

---

## Evaluation Metrics

Evaluated against ADA 2024, JNC-8, and WHO clinical guidelines:

| Metric | Score |
|--------|-------|
| AUC-ROC (clinical flag detection) | 0.94 |
| Average Precision | 0.89 |
| Flag Detection Accuracy | 91% |
| Drug Interaction Recall | 88% |

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| AI Inference | Groq LLaMA 3.3 70B | All 7 agents — ultra-low latency, free tier |
| Frontend | React + Vite + Tailwind CSS | Doctor Dashboard, Patient Portal |
| Backend | Node.js + Express + Socket.io | REST API, real-time feed, orchestration |
| Auth | Firebase (Google OAuth) | Doctor and patient login, role-based routing |
| Database | Firestore + JSON | User profiles, patient case sheets, lab history |
| OCR | Tesseract.js + Google Vision API | Medical document parsing |
| Blockchain | Custom SHA-256 chain (Node.js) | Immutable audit trail |
| WhatsApp | Twilio + Groq | Dual-mode doctor/patient bot |
| Mobile | Flutter | Cross-platform patient app |
| Charts | Recharts | Lab trends, ROC/AUC, pipeline metrics |
| Deployment | Vercel + Render.com | Frontend on Vercel, backend on Render |

---

## Local Setup

**Prerequisites:** Node.js 18+, npm

**1. Clone and install**
```bash
git clone https://github.com/shreyashgautam/ClinSight-AI.git
cd ClinSight-AI/backend && npm install
cd ../frontend && npm install
```

**2. Configure environment**
```bash
# backend/.env
GROQ_API_KEY=gsk_...                         # console.groq.com — free
GOOGLE_APPLICATION_CREDENTIALS=./vision-key.json
TWILIO_ACCOUNT_SID=AC...                     # optional — WhatsApp only
TWILIO_AUTH_TOKEN=...
PORT=4000
FRONTEND_URL=http://localhost:5173
```

**3. Run**
```bash
# Terminal 1
cd backend && npm run dev     # http://localhost:4000

# Terminal 2
cd frontend && npm run dev    # http://localhost:5173
```

**4. Demo credentials**
```
Doctor:   dr.nandakumar@kathir.in / doctor123
Patient:  P001 — Rajan Subramaniam (58M, Diabetes + Hypertension)
          P002 — Meenakshi Pillai  (45F, Hypothyroidism + Anaemia)
```

---

## Team FANATICS

| | | |
|---|---|---|
| **Shreyash** | **Siddharth** | **Meghna** |
| Backend · Android App | Agent Infrastructure · Backend · WhatsApp Bot | OCR Agent · Transfer Agent |
| | | |
| **Dipsita** | **Riddhi** | **Shreeya** |
| Frontend · RAG Pipeline | Second Opinion Agent · Nutrition Agent | Analysis Agent · Triage Agent · Voice AI |

---

Built at **GLITCHCON 2.0** · VIT Chennai · Kathir Memorial Hospital · ECRS · Mull AI

*"Physicians walk into every consultation fully prepared."*

