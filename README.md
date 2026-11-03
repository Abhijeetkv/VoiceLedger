# VoiceLedger - Speak. Track. Remember.

> **AI-Powered Conversational Finance & Task Management Assistant**  
> *A full-stack, voice-native application that converts natural speech into database actions, real-time analytics, automated emails, and spoken responses.*

---

## 1. What VoiceLedger Does

Managing daily expenses and keeping track of deadlines is usually tedious: people have to open multiple apps, navigate forms, select dropdowns, and manually type numbers. Most users abandon expense tracking because of this friction.

**VoiceLedger removes all manual friction by replacing forms with a single sentence.**

A user can speak naturally in English or Hindi:
> *"I spent 250 rupees on lunch and remind me to submit my college form on Friday."*

VoiceLedger simultaneously:
1. **Listens and Transcribes**: Converts voice into text in real-time in the user's browser.
2. **Understands and Dissects**: Uses Gemini 2.0 Flash to extract multiple distinct actions from one sentence.
3. **Executes and Persists**: Stores the ₹250 `Food` expense in PostgreSQL and schedules the Friday deadline in the task registry.
4. **Calculates and Summarizes**: Computes live balances, category totals, and weekly aggregates directly from PostgreSQL.
5. **Automates Communication**: Generates and sends structured spending reports via Resend (or labeled mock mode).
6. **Replies with Voice**: Synthesizes natural audio feedback back to the user:
   > *"Done! Your ₹250 lunch expense has been saved, and your college form reminder is set for Friday."*

---

## 2. System Architecture

VoiceLedger is designed with a strict client-server decoupling:
- **Frontend (`frontend/`)**: React 19 SPA powered by Vite, Tailwind CSS, Web Speech API, and Recharts.
- **Backend (`backend/`)**: Node.js & Express.js REST API with ES Modules, Zod schema validation, and Gemini AI SDK.
- **Persistence Layer**: Neon Cloud PostgreSQL managed via Prisma ORM with Decimal-precision arithmetic.
- **Outbound Services**: Resend API for transactional email notifications.

### High-Level Architecture Diagram

```mermaid
graph TD
    User([User Voice / Text]) -->|Audio Stream| BrowserSpeech[Browser Web Speech API]
    BrowserSpeech -->|Transcript| ReactClient[React 19 + Vite Frontend]
    ReactClient -->|POST /api/voice-command| ExpressServer[Express.js REST Backend]
    
    subgraph Backend Engine
        ExpressServer --> ZodVal[Zod Validation Layer]
        ZodVal --> AIService[AI Provider - Google Gemini 2.0 Flash]
        AIService -->|Structured Action JSON| ActionExec[Action Execution Engine]
        
        ActionExec -->|CRUD / Queries| PrismaClient[Prisma ORM]
        ActionExec -->|Summary Emails| ResendEmail[Resend API / Mock Service]
        ActionExec -->|Live Aggregates| AnalyticsEngine[PostgreSQL Spending Calculator]
    end
    
    PrismaClient -->|SQL Connection Pool| NeonDB[(Neon PostgreSQL Free Tier)]
    
    ActionExec -->|Spoken Reply + Results| ExpressServer
    ExpressServer -->|JSON Response| ReactClient
    ReactClient -->|Spoken Audio| SpeechSynth[Browser SpeechSynthesis API]
    ReactClient -->|Real-Time Update| DashboardUI[Dashboard Charts & Tables]
```

---

## 3. The Voice-to-Action Lifecycle

When you speak to VoiceLedger, the request passes through a 6-stage reactive pipeline:

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Browser as Web Speech API
    participant Client as React Client
    participant Server as Express Server
    participant Gemini as Gemini AI
    participant DB as Neon PostgreSQL
    participant Audio as SpeechSynthesis

    User->>Browser: "Spent 250 on lunch and remind me to submit form on Friday"
    Browser->>Client: Emits live transcript (interim -> final)
    Note over Client: Mutes SpeechSynthesis to prevent feedback loops
    Client->>Server: POST /api/voice-command { transcript, timezone, dateISO, lang }
    Server->>Gemini: Prompt with schemas, relative date context, INR defaults
    Gemini-->>Server: JSON: { actions: [ADD_EXPENSE, ADD_REMINDER], spokenReply: "..." }
    Server->>Server: Zod schema verification & category normalization
    Server->>DB: Prisma.expense.create({ amount: 250, category: 'Food' })
    Server->>DB: Prisma.task.create({ type: 'REMINDER', dueDate: '2026-11-06...' })
    Server->>DB: Prisma.commandHistory.create({ transcript, actions, results })
    Server-->>Client: 200 OK { success: true, actions, results, spokenReply }
    Client->>Dashboard: Re-fetch /api/summary & update Recharts
    Client->>Audio: Speak spokenReply ("Done! Your ₹250 lunch expense has been saved...")
    Audio-->>User: Audio playback
```

---

## 4. Key Functional Modules

### 1. AI Voice Command Engine (`backend/src/services/ai.js`)
- Uses the official `@google/genai` SDK with `gemini-2.0-flash`.
- Compact system prompt with allowed action schemas:
  - `ADD_EXPENSE`: Amount, category, note, ISO date, currency.
  - `ADD_REMINDER`: Title, ISO due date.
  - `ADD_TASK`: Title, optional due date.
  - `SEND_EMAIL`: Recipient, subject, body.
  - `QUERY_SUMMARY`: Period (`today`, `week`, `month`, `all`), category filter.
  - `DELETE_LAST`: Purges latest record.
- **Relative Date Resolution**: Accurately computes "tomorrow", "next Friday", "in 3 days" using client timezone offset.
- **Multilingual Recognition**: Full support for Indian English (`en-IN`) and Hindi (`hi-IN`).
- **Resilience**: Automatic retry on JSON parse failures; safely prompts for clarification when intent is ambiguous.

### 2. Action Execution Engine (`backend/src/services/actions.js`)
- Executes real database operations using Prisma transactions.
- Zero-hallucination spending analytics: Financial totals are calculated via SQL aggregates directly from PostgreSQL, **never invented by the LLM**.
- Fallback delete validation to prevent accidental record loss.

### 3. Expense & Analytics Dashboard (`frontend/src/pages/Dashboard.jsx`)
- 4 real-time stat cards: Today's Spending, Weekly Spending, Monthly Spending, and Total Transactions.
- Interactive Recharts bar visualization showing category breakdowns.
- Recent transaction logs with colored category pills.
- Quick Voice button directly on the dashboard.

### 4. Tasks & Proactive Reminder Polling (`frontend/src/pages/Tasks.jsx`)
- Complete task manager separating open tasks from scheduled reminders.
- **30-Second Client Polling**: Queries `/api/reminders/due` to catch due notifications.
- **Anti-Spam State**: Automatically marks reminders as `notified: true` in PostgreSQL once surfaced.

### 5. Transactional Email Service (`backend/src/services/email.js`)
- Powered by Resend's HTTPS API.
- Generates HTML summaries of weekly spending.
- **Honest MOCK Mode**: When no `RESEND_API_KEY` is present, logs details to console and displays clear mock badges in the UI - never deceitfully claiming an email was delivered.

### 6. The Honesty Panel (`frontend/src/pages/Settings.jsx`)
- Directly displays real integration diagnostics queried from `GET /api/config/status`:
  - AI Engine: `Gemini Live` or `Key Required`.
  - Database: `PostgreSQL + Prisma` connection status.
  - Email: `Resend REAL` or `Resend MOCK Mode`.
  - Browser: Native Web Speech Recognition & SpeechSynthesis support check.

---

## 5. Database Schema & Prisma Models

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

## 6. Repository Layout

```
Voiceledger/
├── package.json              # Root package with concurrently dev scripts
├── README.md                 # Complete system documentation
│
├── backend/                  # REST API & Database Service
│   ├── prisma/
│   │   ├── schema.prisma     # Prisma Data Model
│   │   ├── seed.js           # 30-Day College Dataset Seeder
│   │   └── migrations/       # SQL Migrations
│   ├── src/
│   │   ├── index.js          # Express app entry & graceful shutdown
│   │   ├── lib/prisma.js     # Shared PrismaClient singleton
│   │   ├── middleware/       # Error & Zod handler
│   │   ├── routes/           # voice, expenses, tasks, summary, demo
│   │   ├── services/         # ai.js, actions.js, email.js, summary.js
│   │   └── utils/validation.js # Zod schemas for all models & requests
│   ├── .env.example
│   ├── .env
│   ├── package.json
│   └── README.md             # Backend-specific architecture guide
│
└── frontend/                 # React 19 Frontend Application
    ├── index.html
    ├── vite.config.js        # Local /api proxy configuration
    ├── tailwind.config.js    # SaaS Navy (#0a0d1a) theme tokens
    ├── src/
    │   ├── main.jsx          # React DOM entry
    │   ├── App.jsx           # Routes & ToastProvider
    │   ├── components/       # MicButton, StatCard, Waveform, Form, etc.
    │   ├── context/          # ToastContext state
    │   ├── hooks/            # useVoice (Speech Recognition & Synthesis)
    │   ├── pages/            # Dashboard, Assistant, Expenses, Tasks, Settings
    │   └── services/api.js   # Axios REST client
    ├── package.json
    └── README.md             # Frontend-specific architecture guide
```

---

## 7. Installation & Setup

### Prerequisites
- Node.js 18+
- Neon PostgreSQL connection string (or any PostgreSQL instance)
- Google Gemini API key (free from Google AI Studio)

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Configure Environment
In `backend/.env`:
```env
DATABASE_URL="postgresql://user:password@ep-sample-123.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
GEMINI_API_KEY="AIzaSy..."
GEMINI_MODEL="gemini-2.0-flash"
AI_PROVIDER="gemini"
RESEND_API_KEY=""                # Leave blank for automatic MOCK mode
EMAIL_FROM="onboarding@resend.dev"
DEFAULT_EMAIL_TO="user@example.com"
PORT=5000
CLIENT_URL="http://localhost:5173"
NODE_ENV="development"
```

### 3. Sync Database & Seed Demo Data
```bash
cd backend
npx prisma db push
node prisma/seed.js
cd ..
```

### 4. Start Local Development
```bash
npm run dev
```
- **Web App**: http://localhost:5173
- **API Server**: http://localhost:5000

---

## 8. Verification Scenarios & Demo Script

### Test Cases

| Scenario | Input Phrase | What It Does |
|---|---|---|
| **Single Expense** | *"I spent 250 rupees on lunch"* | Adds ₹250 to `Food` category; updates today's total; speaks confirmation. |
| **Single Reminder** | *"Remind me to submit my assignment tomorrow"* | Creates a reminder task with tomorrow's timestamp. |
| **Atomic Multi-Action** | *"I spent 250 rupees on lunch and remind me to submit my college form on Friday"* | Extracts both actions simultaneously, saves both to PostgreSQL, confirms with combined spoken response. |
| **Live Spending Query** | *"How much did I spend this week?"* | Queries PostgreSQL directly, sums up category totals, and responds with real numbers. |
| **Email Summary** | *"Email my weekly spending summary to my email"* | Computes weekly stats and dispatches via Resend (or logs formatted MOCK email). |
| **Unclear Input** | *"Tomorrow morning please"* | Detects missing action context, returns no-op, and asks a helpful clarification question. |
| **Hindi Language** | *"मैंने दोपहर के खाने पर 200 रुपये खर्च किए"* | Extracts ₹200 expense and responds in conversational Hindi. |

---

## 9. Free-Tier Deployment Notes

1. **Database**: Neon.tech free tier (Serverless PostgreSQL with SSL).
2. **Backend**: Render.com Free Web Service (Root: `backend`, Build: `npm install && npx prisma db push`, Start: `npm start`).
3. **Frontend**: Vercel.com Hobby tier (Root: `frontend`, Framework: Vite).
