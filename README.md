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
2. **Understands and Dissects**: Uses Google Gemini 3.8 Flash (backed by a natural language rule engine) to extract multiple distinct actions from one sentence.
3. **Executes and Persists**: Stores the ₹350 and ₹250 `Food` expenses in PostgreSQL and schedules the Friday deadline in the task registry.
4. **Calculates and Summarizes**: Computes live balances, category totals, and weekly aggregates directly from PostgreSQL.
5. **Automates Communication**: Generates and sends structured spending reports via Resend (or labeled mock mode).
6. **Replies with Voice**: Synthesizes natural audio feedback back to the user:
   > *"Done! Added ₹350 on Swiggy and ₹250 on Zomato (Total: ₹600), and your college form reminder is set for Friday."*

---

## 2. System Architecture

VoiceLedger is designed with a strict client-server decoupling:
- **Frontend (`frontend/`)**: React 19 Single Page Application powered by Vite, Tailwind CSS, Lucide Icons, Web Speech API, and Recharts.
- **Backend (`backend/`)**: Node.js & Express.js REST API with ES Modules, Zod schema validation, Prisma ORM, and Google Gemini API SDK.
- **Persistence Layer**: Neon Cloud PostgreSQL managed via Prisma ORM with Decimal-precision arithmetic and JWT authentication.
- **Outbound Services**: Resend API for transactional email notifications.
- **Deployment**: Vercel-ready serverless backend and optimized static frontend with client-side SPA routing.

### High-Level Architecture Diagram

```mermaid
graph TD
    User([User Voice / Text]) -->|Audio Stream| BrowserSpeech[Browser Web Speech API]
    BrowserSpeech -->|Transcript| ReactClient[React 19 + Vite Frontend]
    ReactClient -->|REST API with JWT| ExpressServer[Express.js on Vercel Serverless]
    
    subgraph Backend Engine
        ExpressServer --> AuthMid[JWT Authentication Middleware]
        AuthMid --> ZodVal[Zod Validation Layer]
        ZodVal --> AIService[AI Provider - Google Gemini 3.8 Flash]
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
    participant Gemini as Gemini AI / Fallback Engine
    participant DB as Neon PostgreSQL
    participant Audio as SpeechSynthesis

    User->>Browser: "Spent 350 on Swiggy and 250 on Zomato"
    Browser->>Client: Emits live transcript (interim -> final)
    Note over Client: Mutes SpeechSynthesis to prevent feedback loops
    Client->>Server: POST /api/voice-command { transcript, timezone, dateISO, lang }
    Server->>Gemini: Prompt with schemas, relative date context, INR defaults
    Gemini-->>Server: JSON: { actions: [ADD_EXPENSE, ADD_EXPENSE], spokenReply: "..." }
    Server->>Server: Zod schema verification & category normalization
    Server->>DB: Prisma.expense.create({ amount: 350, category: 'Food', note: 'Swiggy' })
    Server->>DB: Prisma.expense.create({ amount: 250, category: 'Food', note: 'Zomato' })
    Server->>DB: Prisma.commandHistory.create({ transcript, actions, results })
    Server-->>Client: 200 OK { success: true, actions, results, spokenReply }
    Client->>Client: Update Dashboard state & Recharts analytics
    Client->>Audio: Speak spokenReply ("Done! Added ₹350 on Swiggy and ₹250 on Zomato...")
    Audio-->>User: Audio playback
```

---

## 4. Key Functional Modules

### 1. AI Voice Command Engine (`backend/src/services/ai.js`)
- Primary provider: Google Gemini 3.8 Flash via the official `@google/genai` SDK.
- Zero-Downtime Fallback Parser: When external AI quotas are exhausted or offline, an intelligent natural language tokenizer parses compound multi-expense sentences, relative reminders (e.g. "on Friday", "tomorrow"), tasks, and spending queries with brand categorization (Swiggy, Zomato, Blinkit, Uber, Ola, etc.).

### 2. Multi-Action Execution Engine (`backend/src/services/actions.js`)
- Executes multiple atomic operations sequentially in a single voice request:
  - `ADD_EXPENSE`: Creates expense record with validated category and amount.
  - `ADD_REMINDER`: Schedules calendar alerts with due dates.
  - `ADD_TASK`: Creates to-do items.
  - `SEND_EMAIL`: Dispatches structured HTML summary reports via Resend.
  - `QUERY_SUMMARY`: Real-time SQL aggregation across timeframes.
  - `DELETE_LAST`: Undoes the most recent expense.

### 3. JWT Authentication System (`backend/src/routes/auth.js`)
- Secure token-based authentication using `jsonwebtoken` and `bcryptjs` password hashing.
- Endpoints:
  - `POST /api/auth/signup`: Create a user account.
  - `POST /api/auth/login`: Authenticate existing users.
  - `POST /api/auth/demo`: 1-Click instant login for immediate evaluation with pre-seeded demo access.
  - `GET /api/auth/me`: Current user session check.

### 4. Clean White SaaS Design System
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
| `POST` | `/api/voice-command` | Process natural speech, execute actions, return audio reply |

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
GEMINI_MODEL="gemini-3.8-flash"
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
2. Add Environment Variables (`DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY`, `RESEND_API_KEY`, `CLIENT_URL`).
3. Deploy. The backend exposes serverless functions via `api/index.js` and `vercel.json`.

### Frontend Deployment (Vercel Static SPA)
1. Import the repository and set **Root Directory** to `frontend`.
2. Framework Preset: **Vite**.
3. Add Environment Variable:
   - `VITE_API_URL`: Your deployed backend URL (e.g. `https://your-backend.vercel.app`)
4. Deploy. The frontend includes `vercel.json` rewrites for client-side SPA routing.
