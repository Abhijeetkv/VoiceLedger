# VoiceLedger Frontend Client

The frontend client for **VoiceLedger** is built with React 19, Vite, Tailwind CSS, Lucide Icons, and Recharts. It delivers a fast, responsive, white-themed dashboard with real-time speech capture and speech synthesis feedback.

---

## Architecture and Component Hierarchy

```mermaid
graph TD
    App[App.jsx] --> AuthProvider[AuthContext]
    AuthProvider --> ToastProvider[ToastContext]
    ToastProvider --> Router[React Router]
    
    subgraph Routes
        Router --> AuthPage[/auth - Minimalist Auth]
        Router --> Layout[Layout.jsx]
        
        Layout --> Sidebar[Sidebar.jsx Navigation]
        Layout --> Dashboard[/ - Overview & Analytics]
        Layout --> Assistant[/assistant - AI Voice Assistant]
        Layout --> Expenses[/expenses - Expense Tracker]
        Layout --> Tasks[/tasks - Tasks & Reminders]
    end
    
    subgraph Core Features
        Dashboard --> Recharts[Category Spending BarChart]
        Dashboard --> StatCards[StatCard.jsx Metrics]
        
        Assistant --> MicBtn[MicButton.jsx Web Speech API]
        Assistant --> Waveform[WaveformAnimation.jsx Audio Bars]
        Assistant --> ChatBox[Chat Container with Contained Auto-Scroll]
        
        Expenses --> ExpForm[ExpenseForm.jsx Modal]
        Expenses --> CatBadge[CategoryBadge.jsx Color Pills]
        
        Tasks --> ConfirmDlg[ConfirmDialog.jsx Modal]
        AuthPage --> MaskedInput[Secure Bullet Masking]
    end
```

---

## Directory Structure

```
frontend/
├── public/                       # Static public assets
├── src/
│   ├── components/               # Reusable UI components
│   │   ├── CategoryBadge.jsx     # High-contrast pastel category badges
│   │   ├── ConfirmDialog.jsx     # Action confirmation modal
│   │   ├── ExpenseForm.jsx       # Modal for adding and editing expenses
│   │   ├── Layout.jsx            # App scaffold with responsive sidebar
│   │   ├── MicButton.jsx         # Animated microphone button
│   │   ├── Sidebar.jsx           # Clean white sidebar with auth profile
│   │   ├── StatCard.jsx          # Metric cards with subtle borders
│   │   ├── Toast.jsx             # Floating notification cards
│   │   └── WaveformAnimation.jsx # Audio frequency wave simulation
│   ├── context/
│   │   ├── AuthContext.jsx       # JWT auth provider (login, signup, demo, logout)
│   │   └── ToastContext.jsx      # Safe toast notifications with string extraction
│   ├── hooks/
│   │   └── useVoice.js           # Web Speech API (Recognition + SpeechSynthesis)
│   ├── pages/
│   │   ├── Assistant.jsx         # Live voice assistant & conversational chat
│   │   ├── Auth.jsx              # Minimalist sign in, sign up & 1-click demo
│   │   ├── Dashboard.jsx         # Spending overview, stats & Recharts graphs
│   │   ├── Expenses.jsx          # Expense management with filters & pagination
│   │   └── Tasks.jsx             # Tasks & reminders with optimistic toggling
│   ├── services/
│   │   └── api.js                # Axios client with flexible Vercel backend URLs
│   ├── App.jsx                   # Route declarations & route guards
│   ├── index.css                 # Clean white design tokens & CSS animations
│   └── main.jsx                  # React 19 application entry point
├── vercel.json                   # Client-side SPA routing rewrites
├── vite.config.js                # Vite build settings & local /api proxy
├── .env.example
├── .env
└── package.json
```

---

## Key Features

1. **Clean White SaaS Design**:
   - Polished white surfaces (`#ffffff`), subtle borders (`slate-200/90`), and violet accent actions.
   - Zero emojis across all components and documentation.
2. **AI Voice Assistant Page (`Assistant.jsx`)**:
   - Audio Volume Toggle: Easily switch between audible voice playback ("Voice On") and silent text mode ("Muted").
   - Smart Contained Scrollbar: Scrollbar remains static while the user is talking into the microphone. Chat scrolls down smoothly inside the chat message container only after the assistant finishes responding.
   - Real-time Speech Capture: Transcribes speech in real-time in English (`en-IN`) and Hindi (`hi-IN`).
   - Mutes speech synthesis while listening to prevent audio feedback loops.
   - Contextual Conversational Memory: Automatically forwards recent conversation turns to the backend with each request.
3. **Conversational Audio Synthesis**:
   - Synthesizes spoken replies directly back to the user upon transaction completion and for casual chatter, guaranteeing the assistant never goes mute.
4. **Resilient API Architecture**:
   - `api.js` automatically resolves backend URLs across `VITE_API_URL`, `VITE_BACKEND_URL`, and local proxies.
5. **Vercel SPA Routing**:
   - `vercel.json` rewrites all sub-routes to `/index.html` so direct link sharing and browser reloads work without 404s.

---

## Environment Variables

Copy `.env.example` to `.env`:

```env
# URL of your deployed backend on Vercel (e.g. https://your-backend.vercel.app)
# Leave empty in local development to use the Vite proxy (http://localhost:5000)
VITE_API_URL=
```
