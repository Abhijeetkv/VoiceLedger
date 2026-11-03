# VoiceLedger Backend Engine

The backend service for **VoiceLedger** is built with Node.js, Express.js (ES Modules), Prisma ORM, and Google Gemini. It handles voice command parsing, database transactions, analytical calculations, JWT authentication, and transactional email dispatches.

---

## Architecture and Component Flow

```mermaid
graph LR
    Req[HTTP Request] --> Express[Express.js App]
    Express --> AuthMid[JWT Authentication Middleware]
    AuthMid --> Router[Express Router]
    
    subgraph Route Handlers
        Router --> AuthRoute[/api/auth]
        Router --> VoiceRoute[/api/voice-command]
        Router --> ExpenseRoute[/api/expenses]
        Router --> TaskRoute[/api/tasks]
        Router --> SummaryRoute[/api/summary]
        Router --> DemoRoute[/api/demo]
    end
    
    VoiceRoute --> AIService[Gemini Flash Lite + Fallback Tokenizer]
    AIService --> ZodVal[Zod Action Validation]
    ZodVal --> ActionExec[Action Execution Engine]
    
    ActionExec --> Prisma[Prisma ORM Client]
    ActionExec --> Resend[Resend Email Service]
    ActionExec --> Analytics[SQL Aggregator]
    
    Prisma --> Postgres[(Neon PostgreSQL)]
```

---

## Directory Structure

```
backend/
├── api/
│   └── index.js                  # Vercel serverless function entry point
├── prisma/
│   ├── schema.prisma             # PostgreSQL data model definitions (with rhel-openssl binary target)
│   └── seed.js                   # Idempotent realistic 30-day college dataset
├── src/
│   ├── index.js                  # Express setup, dynamic origin-echo CORS, middleware
│   ├── lib/
│   │   └── prisma.js             # Shared PrismaClient singleton
│   ├── middleware/
│   │   ├── auth.js               # JWT verification & optional auth middleware
│   │   └── errorHandler.js       # Centralized error handler & Zod formatter
│   ├── routes/
│   │   ├── auth.js               # Signup, login, demo account, and session check
│   │   ├── voice.js              # POST /api/voice-command with history & actions
│   │   ├── expenses.js           # Full CRUD for expense records
│   │   ├── tasks.js              # CRUD for tasks & /api/reminders/due
│   │   ├── summary.js            # Time-period financial aggregates
│   │   └── demo.js               # Seed & Reset operations
│   ├── services/
│   │   ├── ai.js                 # Gemini SDK integration, conversational model failover & tokenizer
│   │   ├── actions.js            # Atomic action dispatcher
│   │   ├── email.js              # Resend API with labeled mock fallback
│   │   └── summary.js            # PostgreSQL database aggregation service
│   └── utils/
│       └── validation.js         # Flexible Zod schemas with case-normalization & history
├── vercel.json                   # Vercel serverless routing configuration
├── .env.example
├── .env
└── package.json
```

---

## API Endpoints Reference

### 1. Authentication (`/api/auth`)
- **`POST /api/auth/signup`**: Register with `email`, `password`, and `name`. Returns JWT token.
- **`POST /api/auth/login`**: Authenticate with `email` and `password`. Returns JWT token.
- **`POST /api/auth/demo`**: 1-Click instant login for the demo user with pre-configured access.
- **`GET /api/auth/me`**: Get currently authenticated user profile from token.

### 2. Voice Command (`/api/voice-command`)
- **`POST /api/voice-command`**
  - **Body**: `{ transcript: string, timezone: string, currentDateISO: string, language: string, userEmail?: string, conversationHistory?: Array<{ role: 'user' | 'assistant', text: string }> }`
  - **Returns**: `{ success: true, actions: Array, results: Array, spokenReply: string, commandId: string }`
  - Supports compound multi-expense sentences: e.g. *"I spent 350 on Swiggy and 250 on Zomato"*.
  - Supports natural conversational dialogue: greetings, affirmations ("yeah yeah yeah", "ok bro"), identity questions, budgeting tips, and jokes.
  - Automatically speaks back and guarantees `spokenReply` is never empty.

### 3. Expenses CRUD (`/api/expenses`)
- **`GET /api/expenses`**: Filter by `category`, `startDate`, `endDate`, `limit`, `offset`.
- **`POST /api/expenses`**: Create an expense `{ amount, currency, category, note, date }`.
- **`PATCH /api/expenses/:id`**: Update fields on an existing expense.
- **`DELETE /api/expenses/:id`**: Permanently remove an expense.

### 4. Tasks & Reminders (`/api/tasks` & `/api/reminders`)
- **`GET /api/tasks`**: Filter by `type` (`TASK` | `REMINDER`), `completed` (boolean).
- **`POST /api/tasks`**: Create a task `{ title, type, dueDate }` (supports flexible date formats and casing).
- **`PATCH /api/tasks/:id`**: Toggle completion, update due date or title.
- **`DELETE /api/tasks/:id`**: Delete task.
- **`GET /api/reminders/due`**: Returns due reminders and marks them `notified: true` to prevent duplicate alerts.

### 5. Summary & Analytics (`/api/summary`)
- **`GET /api/summary?period=today|week|month|all`**: Calculates total sum, transaction count, and category breakdown.

### 6. Diagnostics & System
- **`GET /`**: Server status and API identification.
- **`GET /api/health`**: Uptime and system timestamp.
- **`GET /api/config/status`**: Checks external integrations (DB, Gemini, Resend) without exposing credentials.

---

## Environment Variables

Copy `.env.example` to `.env`:

```env
DATABASE_URL="postgresql://user:password@ep-host-pooler.region.aws.neon.tech/neondb?sslmode=require"
GEMINI_API_KEY="your_gemini_api_key"
GEMINI_MODEL="gemini-flash-lite-latest"
AI_PROVIDER="gemini"
RESEND_API_KEY="re_your_api_key"
EMAIL_FROM="onboarding@resend.dev"
DEFAULT_EMAIL_TO="demo@voiceledger.app"
JWT_SECRET="voiceledger_super_secret_jwt_key_2026"
PORT=5000
CLIENT_URL="http://localhost:5173"
NODE_ENV="development"
```
