# VoiceLedger Backend Engine

The backend service for **VoiceLedger** is built with Node.js, Express.js (ES Modules), Prisma ORM, and Google Gemini 2.0 Flash. It handles voice command parsing, database transactions, analytical calculations, and email dispatches.

---

## Architecture and Component Flow

```mermaid
graph LR
    Req[HTTP Request] --> Express[Express.js App]
    Express --> Router[Express Router]
    
    subgraph Route Handlers
        Router --> VoiceRoute[/api/voice-command]
        Router --> ExpenseRoute[/api/expenses]
        Router --> TaskRoute[/api/tasks]
        Router --> SummaryRoute[/api/summary]
        Router --> DemoRoute[/api/demo]
    end
    
    VoiceRoute --> AIService[Gemini 2.0 Flash Engine]
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
├── prisma/
│   ├── schema.prisma             # PostgreSQL data model definitions
│   ├── seed.js                   # Idempotent realistic 30-day college dataset
│   └── migrations/               # Initial SQL migration scripts
├── src/
│   ├── index.js                  # Express setup, middleware, server listener
│   ├── lib/
│   │   └── prisma.js             # Shared PrismaClient singleton
│   ├── middleware/
│   │   └── errorHandler.js       # Centralized error handler & Zod formatter
│   ├── routes/
│   │   ├── voice.js              # POST /api/voice-command orchestration
│   │   ├── expenses.js           # Full CRUD for expense records
│   │   ├── tasks.js              # CRUD for tasks & /api/reminders/due
│   │   ├── summary.js            # Time-period financial aggregates
│   │   └── demo.js               # Seed & Reset operations
│   ├── services/
│   │   ├── ai.js                 # Gemini SDK integration & prompt engineering
│   │   ├── actions.js            # Atomic action dispatcher
│   │   ├── email.js              # Resend API with honest MOCK fallback
│   │   └── summary.js            # PostgreSQL database aggregation service
│   └── utils/
│       └── validation.js         # Zod schemas for all models & actions
├── .env.example
├── .env
└── package.json
```

---

## API Endpoints Reference

### 1. Voice Command
- **`POST /api/voice-command`**
  - **Body**: `{ transcript: string, timezone: string, currentDateISO: string, language: string, userEmail?: string }`
  - **Returns**: `{ success: true, actions: Array, results: Array, spokenReply: string, commandId: string }`

### 2. Expenses CRUD
- **`GET /api/expenses`**: Filter by `category`, `startDate`, `endDate`, `limit`, `offset`.
- **`POST /api/expenses`**: Create an expense `{ amount, currency, category, note, date }`.
- **`PATCH /api/expenses/:id`**: Update fields on an existing expense.
- **`DELETE /api/expenses/:id`**: Permanently remove an expense.

### 3. Tasks & Reminders
- **`GET /api/tasks`**: Filter by `type` (`TASK` | `REMINDER`), `completed` (boolean).
- **`POST /api/tasks`**: Create a task `{ title, type, dueDate }`.
- **`PATCH /api/tasks/:id`**: Toggle completion, update due date or title.
- **`DELETE /api/tasks/:id`**: Delete task.
- **`GET /api/reminders/due`**: Returns due reminders and marks them `notified: true` to prevent spam.

### 4. Summary & Analytics
- **`GET /api/summary?period=today|week|month|all`**: Calculates total sum, transaction count, and category breakdown.

### 5. Demo & Diagnostics
- **`POST /api/demo/seed`**: Seeds realistic 30-day transactions and tasks.
- **`DELETE /api/demo/reset`**: Requires `{ confirm: "RESET" }`. Purges all data.
- **`GET /api/health`**: Uptime and system timestamp.
- **`GET /api/config/status`**: Powers the frontend Honesty Panel without exposing API secrets.

---

## Environment Variables

```env
DATABASE_URL=postgresql://user:password@ep-sample-123.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.0-flash
AI_PROVIDER=gemini
RESEND_API_KEY=
EMAIL_FROM=onboarding@resend.dev
DEFAULT_EMAIL_TO=demo@voiceledger.app
PORT=5000
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```
