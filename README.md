# VoiceLedger — Speak. Track. Remember. 🎙️💰📋

> **AI-Powered Voice Expense & Task Management MVP**  
> Built for a 6-Hour Solo College Hackathon using JavaScript throughout (No TypeScript).

---

## 🌟 1. Project Overview

**VoiceLedger** turns natural conversational speech into structured financial logs, task schedules, and actionable insights. Users speak naturally:

> *"I spent 250 rupees on lunch and remind me to submit my college form on Friday."*

VoiceLedger executes the complete **voice-to-action cycle**:
1. 🎙️ **Captures Voice**: Browser Web Speech API (`en-IN` English India & `hi-IN` Hindi).
2. 🤖 **AI Reasoning**: Google Gemini API via official `@google/genai` extracts structured multi-action JSON.
3. 💾 **Database Execution**: Prisma ORM performs real ACID transactions in PostgreSQL (Neon).
4. 📧 **Action Engine**: Generates financial summaries, dispatches real/mock emails via Resend.
5. 📊 **Live Dashboard**: Updates category charts, transaction logs, and pending tasks in real-time.
6. 🗣️ **Voice Response**: Speaks feedback back via Web SpeechSynthesis API with anti-feedback mute.

---

## 🏗️ 2. Technology Stack & Separation

VoiceLedger strictly isolates concerns across two directories: `frontend/` and `backend/`.

```
Voiceledger/
├── package.json              # Root orchestrator (concurrent dev scripts)
├── README.md                 # Complete documentation & demo script
├── backend/                  # Node.js + Express + Prisma + Gemini AI
│   ├── prisma/
│   │   ├── schema.prisma     # PostgreSQL models & Enums
│   │   ├── seed.js           # Realistic 30-day demo seeder
│   │   └── migrations/       # SQL migrations
│   ├── src/
│   │   ├── index.js          # Express app entry point & routes mount
│   │   ├── lib/prisma.js     # Shared PrismaClient singleton
│   │   ├── middleware/       # Global error & Zod validation handler
│   │   ├── routes/           # voice, expenses, tasks, summary, demo
│   │   ├── services/         # ai.js (Gemini), actions.js, email.js, summary.js
│   │   └── utils/validation.js # Zod schemas for all requests & AI payloads
│   ├── .env.example
│   └── package.json
└── frontend/                 # React 19 + Vite + Tailwind CSS
    ├── index.html
    ├── vite.config.js        # Local /api proxy to backend:5000
    ├── tailwind.config.js    # Custom navy & violet design tokens
    ├── src/
    │   ├── main.jsx          # App root with BrowserRouter
    │   ├── App.jsx           # Client routes & ToastProvider
    │   ├── components/       # MicButton, StatCard, Layout, Sidebar, etc.
    │   ├── context/          # ToastContext notification system
    │   ├── hooks/            # useVoice (Web Speech Recognition + Synthesis)
    │   ├── pages/            # Dashboard, Assistant, Expenses, Tasks, Settings
    │   └── services/api.js   # Axios client for all backend REST endpoints
    └── package.json
```

---

## 🗄️ 3. Database Architecture (Prisma + PostgreSQL)

```prisma
enum ExpenseCategory {
  Food
  Transport
  Shopping
  Bills
  Health
  Entertainment
  Education
  Other
}

enum TaskType {
  TASK
  REMINDER
}

model Expense {
  id        String          @id @default(cuid())
  amount    Decimal         @db.Decimal(12, 2)
  currency  String          @default("INR")
  category  ExpenseCategory @default(Other)
  note      String          @default("")
  date      DateTime        @default(now())
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt

  @@index([date])
  @@index([category])
}

model Task {
  id        String    @id @default(cuid())
  title     String
  type      TaskType  @default(TASK)
  dueDate   DateTime?
  completed Boolean   @default(false)
  notified  Boolean   @default(false)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  @@index([dueDate])
  @@index([type])
  @@index([completed])
}

model CommandHistory {
  id          String   @id @default(cuid())
  transcript  String
  spokenReply String
  actions     Json
  results     Json
  createdAt   DateTime @default(now())
}
```

---

## 🚀 4. Installation & Local Development

### Prerequisites
- Node.js 18+ installed
- A free PostgreSQL database (e.g. [Neon.tech](https://neon.tech))
- A free Gemini API key (from [Google AI Studio](https://aistudio.google.com))

### Step 1: Install Dependencies
From the root directory:
```bash
npm run install:all
```
*(Or navigate to `backend/` and run `npm install`, then `frontend/` and run `npm install`)*

### Step 2: Configure Environment Variables
Inside `backend/`, copy `.env.example` to `.env`:
```bash
cp backend/.env.example backend/.env
```
Edit `backend/.env` with your credentials:
```env
DATABASE_URL="postgresql://user:password@ep-sample-123.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
GEMINI_API_KEY="AIzaSy..."
GEMINI_MODEL="gemini-2.0-flash"
AI_PROVIDER="gemini"
RESEND_API_KEY=""                # Optional: leave blank for automatic MOCK mode
EMAIL_FROM="onboarding@resend.dev"
DEFAULT_EMAIL_TO="user@example.com"
PORT=5000
CLIENT_URL="http://localhost:5173"
NODE_ENV="development"
```

### Step 3: Run Database Migrations & Seed
```bash
cd backend
npx prisma db push
node prisma/seed.js
cd ..
```

### Step 4: Run Application
To start both Backend and Frontend concurrently:
```bash
npm run dev
```
- **Frontend App**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000`
- **Backend Health Check**: `http://localhost:5000/api/health`

---

## 🔌 5. API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/voice-command` | Core AI extraction & multi-action execution |
| `GET` | `/api/expenses` | List expenses (supports `category`, `startDate`, `endDate`, pagination) |
| `POST` | `/api/expenses` | Add single expense manually |
| `PATCH` | `/api/expenses/:id` | Update expense record |
| `DELETE` | `/api/expenses/:id` | Delete expense record |
| `GET` | `/api/tasks` | List tasks & reminders (filter by `type`, `completed`) |
| `POST` | `/api/tasks` | Add task or reminder |
| `PATCH` | `/api/tasks/:id` | Toggle task completion or edit title |
| `DELETE` | `/api/tasks/:id` | Delete task record |
| `GET` | `/api/reminders/due` | Poll overdue reminders (marks `notified: true` to prevent duplicates) |
| `GET` | `/api/summary` | Analytics aggregate (`period=today\|week\|month\|all`) |
| `POST` | `/api/demo/seed` | Seed realistic 30-day college dataset |
| `DELETE` | `/api/demo/reset` | Safe purge of all records (`confirm: "RESET"`) |
| `GET` | `/api/health` | Uptime and status check |
| `GET` | `/api/config/status` | Honesty Panel diagnostics (without leaking secrets) |

---

## 🛡️ 6. Honesty Panel & Zero-Deception Architecture

Located in **Settings & System Diagnostics** (`/settings`), the Honesty Panel queries actual backend state in real-time:
- **AI Engine**: Live connection status to Gemini 2.0 Flash via `@google/genai`.
- **Database & ORM**: PostgreSQL connection verified through Prisma Client.
- **Email Service**: Shows `Resend REAL` when an API key is present, or `Resend MOCK Mode` with a yellow notice. Never claims a mock email was delivered.
- **Speech Capabilities**: Directly detects client browser Web Speech API & SpeechSynthesis support.

---

## 🧪 7. Verification Test Scenarios

| Test Case | Voice Command / Action | Expected Result |
|---|---|---|
| **1. Single Expense** | *"I spent 250 rupees on lunch"* | Logs ₹250 under `Food` category in PostgreSQL. Speaks: *"Done! Your ₹250 lunch expense has been saved."* |
| **2. Single Reminder** | *"Remind me to submit my assignment tomorrow"* | Creates a `REMINDER` in `Task` table with tomorrow's ISO date. |
| **3. Multi-Action** | *"I spent 250 rupees on lunch and remind me to submit my college form on Friday"* | Atomic multi-action: Saves ₹250 expense AND schedules Friday reminder in one go. |
| **4. Live Spending Query** | *"How much did I spend this week?"* | Calculates actual PostgreSQL sum. Responds: *"You spent ₹... this week across ... transactions."* |
| **5. Email Summary** | *"Email my weekly spending summary to my email address"* | Queries PostgreSQL weekly total, generates structured template, sends via Resend or logs MOCK dispatch. |
| **6. Ambiguous Input** | *"Tomorrow morning please"* | Returns empty actions array and asks a clarification question. |
| **7. Multi-Lingual** | *"मैंने दोपहर के खाने पर 200 रुपये खर्च किए"* | Resolves Hindi voice input into ₹200 `Food` expense and replies in Hindi. |

---

## 🎬 8. Three-Minute Live Demo Script

1. **Introduction (0:00 - 0:30)**:
   - Introduce VoiceLedger: *"VoiceLedger is an AI-powered voice expense and task manager for students and professionals. Speak. Track. Remember."*
   - Show the Honesty Panel in `/settings` to prove real PostgreSQL, Prisma, and Gemini integration.
2. **Multi-Action Voice Cycle (0:30 - 1:15)**:
   - Navigate to `/assistant`.
   - Click the animated microphone and speak:  
     *"I spent 250 rupees on lunch and remind me to submit my college form on Friday."*
   - Observe real-time waveform, AI JSON extraction, database insertion, and spoken voice confirmation.
3. **Database & Dashboard Reflection (1:15 - 2:00)**:
   - Switch to `/` (Dashboard).
   - Point out the newly updated Today's spending (+₹250), category distribution chart, and the upcoming Friday reminder.
4. **Analytics & Email Automation (2:00 - 2:45)**:
   - Click Quick Mic on Dashboard or Assistant:  
     *"How much did I spend this week?"*
   - Assistant queries PostgreSQL and speaks actual totals.
   - Speak: *"Email my weekly spending summary to my email."*
   - Highlight delivery feedback (Real Resend or labeled Mock mode).
5. **Conclusion (2:45 - 3:00)**:
   - Showcase Hindi language switch (`hi-IN`) and demo data reset functionality.

---

## ☁️ 9. Free-Tier Deployment Guide

### Database (Neon PostgreSQL Free Tier)
1. Sign up at [neon.tech](https://neon.tech) and create a project.
2. Copy the pooled connection string (with `sslmode=require`).
3. Set as `DATABASE_URL` in your environment.

### Backend (Render Free Web Service)
1. Push this repository to GitHub.
2. Create a **New Web Service** on Render.
3. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npx prisma db push`
   - **Start Command**: `npm start`
   - **Environment Variables**: Add `DATABASE_URL`, `GEMINI_API_KEY`, `RESEND_API_KEY`, `PORT=5000`, `CLIENT_URL=https://your-frontend.vercel.app`.

### Frontend (Vercel Hobby Tier)
1. Import repository on [vercel.com](https://vercel.com).
2. Configure:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add Rewrite in `vercel.json` if directing `/api` calls directly to your Render backend URL.

# VoiceLedger
