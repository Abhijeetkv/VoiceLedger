# VoiceLedger - Speak. Track. Remember.

> **AI-Powered Conversational Finance & Task Management Assistant**  
> *A full-stack, voice-native application that converts natural speech into database actions, real-time analytics, automated emails, and spoken responses.*

---

## 1. What VoiceLedger Does

Managing daily expenses and keeping track of deadlines is usually tedious: people have to open multiple apps, navigate forms, select dropdowns, and manually type numbers. Most users abandon expense tracking because of this friction.

**VoiceLedger removes all manual friction by replacing forms with a single sentence.**

A user can speak naturally in English or Hindi:
> *"I spent 350 rupees on Swiggy and 250 on Zomato and remind me to submit my college form on Friday."*

VoiceLedger simultaneously:
1. **Listens and Transcribes**: Converts voice into text in real-time in the user's browser using the Web Speech API.
2. **Understands and Dissects**: Uses Gemini Flash Lite (backed by a conversational intelligence chain and an offline natural language rule engine) to extract multiple distinct actions from one sentence.
3. **Engages in Natural Conversation**: Answers greetings, casual questions, budgeting inquiries, and clarifications naturally with voice responses while keeping database actions atomic.
4. **Executes and Persists**: Stores the ₹350 and ₹250 `Food` expenses in PostgreSQL and schedules the Friday deadline in the task registry.
5. **Calculates and Summarizes**: Computes live balances, category totals, and weekly aggregates directly from PostgreSQL.
6. **Automates Communication**: Generates and sends structured spending reports via Resend (or labeled mock mode).
7. **Replies with Voice**: Synthesizes natural audio feedback back to the user:
   > *"Done! Added ₹350 on Swiggy and ₹250 on Zomato (Total: ₹600), and your college form reminder is set for Friday."*

---

## 2. System Architecture

VoiceLedger is designed with a strict client-server decoupling:
- **Frontend (`frontend/`)**: React 19 Single Page Application powered by Vite, Tailwind CSS, Lucide Icons, Web Speech API, and Recharts.
- **Backend (`backend/`)**: Node.js & Express.js REST API with ES Modules, Zod schema validation, Prisma ORM, and Google Gemini API SDK.
- **Persistence Layer**: Neon Cloud PostgreSQL managed via Prisma ORM with Decimal-precision arithmetic and JWT authentication.
- **Outbound Services**: Resend API for transactional email notifications.
- **Deployment**: Vercel-ready serverless backend with origin-echo CORS and optimized static frontend with client-side SPA routing.

### High-Level Architecture Diagram

```mermaid
graph TD
    User([User Voice / Text]) -->|Audio Stream| BrowserSpeech[Browser Web Speech API]
    BrowserSpeech -->|Transcript| ReactClient[React 19 + Vite Frontend]
    ReactClient -->|REST API with JWT + History| ExpressServer[Express.js on Vercel Serverless]
    
    subgraph Backend Engine
        ExpressServer --> AuthMid[JWT Authentication Middleware]
        AuthMid --> ZodVal[Zod Validation Layer]
        ZodVal --> AIService[AI Provider - Gemini Flash Lite with Fallback Chain]
        AIService -->|Compound Action JSON| ActionExec[Action Execution Engine]
        
        ActionExec -->|CRUD / Queries| PrismaClient[Prisma ORM]
        ActionExec -->|Summary Emails| ResendEmail[Resend API / Mock Service]
        ActionExec -->|Live Aggregates| AnalyticsEngine[PostgreSQL Spending Calculator]
    end
    
    PrismaClient -->|Connection Pool| NeonDB[(Neon PostgreSQL Database)]
    
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
    participant Gemini as Gemini Flash Lite / Fallback Engine
    participant DB as Neon PostgreSQL
    participant Audio as SpeechSynthesis

    User->>Browser: "Spent 350 on Swiggy and 250 on Zomato"
    Browser->>Client: Emits live transcript (interim -> final)
    Note over Client: Scrollbar stays fixed while speaking
    Client->>Server: POST /api/voice-command { transcript, timezone, dateISO, lang, conversationHistory }
    Server->>Gemini: Prompt with schemas, relative dates, conversation context, INR defaults
    Gemini-->>Server: JSON: { actions: [ADD_EXPENSE, ADD_EXPENSE], spokenReply: "..." }
    Server->>Server: Zod schema verification & category normalization
    Server->>DB: Prisma.expense.create({ amount: 350, category: 'Food', note: 'Swiggy' })
    Server->>DB: Prisma.expense.create({ amount: 250, category: 'Food', note: 'Zomato' })
    Server->>DB: Prisma.commandHistory.create({ transcript, actions, results })
    Server-->>Client: 200 OK { success: true, actions, results, spokenReply }
    Client->>Client: Scroll chat container smoothly to new response
    Client->>Client: Update Dashboard state & Recharts analytics
    Client->>Audio: Speak spokenReply out loud
    Audio-->>User: Audio playback
```

---

## 4. Key Functional Modules

### 1. AI Voice Command & Dialogue Engine (`backend/src/services/ai.js`)
- Primary provider: Google Gemini (`gemini-flash-lite-latest`) with automatic model failover (`gemini-flash-lite-latest` -> `gemini-3.1-flash-lite` -> `gemini-3.5-flash-lite`).
- Natural Conversational Dialogue: Handles general chatter, greetings, affirmations ("yeah yeah yeah", "ok bro"), requests for advice, and jokes warmly without muting or throwing errors.
- Multi-Turn Conversation History: Incorporates the recent interaction context so the assistant understands follow-up commands and questions.
- Zero-Downtime Fallback Parser: When external AI quotas are exhausted or network is offline, a natural language rule engine parses compound multi-expense sentences, relative reminders (e.g. "on Friday", "tomorrow"), tasks, spending queries, and small talk.

### 2. Multi-Action Execution Engine (`backend/src/services/actions.js`)
- Executes multiple atomic operations sequentially in a single voice request:
  - `ADD_EXPENSE`: Creates expense record with validated category and amount.
  - `ADD_REMINDER`: Schedules calendar alerts with due dates.
  - `ADD_TASK`: Creates to-do items.
  - `SEND_EMAIL`: Dispatches structured HTML summary reports via Resend.
  - `QUERY_SUMMARY`: Real-time SQL aggregation across timeframes.
  - `DELETE_LAST`: Undoes the most recent expense.

### 3. Voice Assistant Interface (`frontend/src/pages/Assistant.jsx`)
- Audio Volume Toggle: Switch between live voice playback ("Voice On") and silent text mode ("Muted").
- Smart Contained Scrollbar: Scrollbar remains static while the user is talking into the microphone. Chat scrolls down smoothly inside the chat message container only after the assistant finishes responding.
- Multi-Turn Activity Log: Displays user speech bubbles and assistant responses with actionable status pills.
- Always Responsive: Every assistant reply is spoken out loud to guarantee the assistant never goes mute.

### 4. JWT Authentication System (`backend/src/routes/auth.js`)
- Secure token-based authentication using `jsonwebtoken` and `bcryptjs` password hashing.
- Endpoints:
  - `POST /api/auth/signup`: Create a user account.
  - `POST /api/auth/login`: Authenticate existing users.
  - `POST /api/auth/demo`: 1-Click instant login for immediate evaluation with pre-seeded demo access.
  - `GET /api/auth/me`: Current user session check.

### 5. Clean White SaaS Design System
- Modern light UI with `#ffffff` and `#fafbfc` card surfaces, subtle slate borders, and crisp typography.
- Interactive Recharts graphs with custom tooltips.
- Visual microphone button with waveform animation and audio state indicators.
- Strict documentation and codebase integrity with zero emojis.

---

## 5. API Endpoints Reference

### Authentication
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/signup` | Register new user account |
| `POST` | `/api/auth/login` | Login with email and password |
| `POST` | `/api/auth/demo` | 1-Click instant demo authentication |
| `GET` | `/api/auth/me` | Fetch authenticated user profile |

### Voice Commands
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/voice-command` | Process natural speech and conversation history, execute actions, return spoken reply |

### Expenses
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/expenses` | List expenses (supports category, date, and pagination filters) |
| `POST` | `/api/expenses` | Manually create an expense record |
| `PATCH` | `/api/expenses/:id` | Update an existing expense |
| `DELETE` | `/api/expenses/:id` | Delete an expense |

### Tasks & Reminders
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/tasks` | List tasks & reminders by type and status |
| `POST` | `/api/tasks` | Create a task or reminder |
| `PATCH` | `/api/tasks/:id` | Toggle completion status or edit due date |
| `DELETE` | `/api/tasks/:id` | Remove a task or reminder |
| `GET` | `/api/reminders/due` | Poll overdue reminders and mark notified |

### Analytics & Diagnostics
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/summary` | Query financial aggregates (`today`, `week`, `month`, `all`) |
| `GET` | `/api/health` | Uptime and server timestamp |
| `GET` | `/api/config/status` | Safe configuration status check |

---

## 6. Local Development Setup

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL database (or free Neon PostgreSQL connection string)

### 1. Clone & Install
```bash
# Clone the repository
git clone <repository-url>
cd Voiceledger

# Install Backend Dependencies
cd backend
npm install

# Install Frontend Dependencies
cd ../frontend
npm install
```

### 2. Configure Environment Variables

**Backend (`backend/.env`):**
```env
DATABASE_URL="postgresql://user:password@ep-host-pooler.region.aws.neon.tech/neondb?sslmode=require"
GEMINI_API_KEY="your_gemini_api_key"
GEMINI_MODEL="gemini-flash-lite-latest"
AI_PROVIDER="gemini"
RESEND_API_KEY="your_resend_api_key"
EMAIL_FROM="onboarding@resend.dev"
DEFAULT_EMAIL_TO="demo@voiceledger.app"
JWT_SECRET="voiceledger_super_secret_jwt_key_2026"
PORT=5000
CLIENT_URL="http://localhost:5173"
NODE_ENV="development"
```

**Frontend (`frontend/.env`):**
```env
# Leave blank in local dev so Vite automatically proxies /api to http://localhost:5000
VITE_API_URL=
```

### 3. Initialize Database
```bash
cd backend
npx prisma db push
```

### 4. Run Development Servers
```bash
# Terminal 1 - Backend (http://localhost:5000)
cd backend
npm run dev

# Terminal 2 - Frontend (http://localhost:5173)
cd frontend
npm run dev
```

---

## 7. Vercel Deployment

### Backend Deployment (Vercel Serverless)
1. In Vercel, import the repository and set **Root Directory** to `backend`.
2. Add Environment Variables:
   - `DATABASE_URL`: Neon PostgreSQL pooled connection string.
   - `JWT_SECRET`: Secret key for signing tokens.
   - `GEMINI_API_KEY`: Google Gemini API key.
   - `GEMINI_MODEL`: `gemini-flash-lite-latest`.
   - `RESEND_API_KEY`: Resend API key for outbound emails.
   - `CLIENT_URL`: URL of the deployed frontend (e.g. `https://voice-ledger-seven.vercel.app`).
3. Deploy. Serverless routes are handled via `api/index.js` and `vercel.json`.

### Frontend Deployment (Vercel Static SPA)
1. Import the repository and set **Root Directory** to `frontend`.
2. Framework Preset: **Vite**.
3. Add Environment Variable:
   - `VITE_API_URL`: Your deployed backend URL (e.g. `https://voice-ledger-ynid.vercel.app`).
4. Deploy. The frontend includes `vercel.json` rewrites for client-side SPA routing.
