# VoiceLedger Frontend Client

The frontend application for **VoiceLedger** is built with React 19, Vite, Tailwind CSS, Lucide React icons, and Recharts. It provides an intuitive, voice-first SaaS dashboard designed with dark navy themes and violet accents.

---

## UI/UX Design System

- **Background**: `#0a0d1a` (deepest dark), `#0f1225` (sidebar), `#1a1f3a` (cards).
- **Accents**: `#8b5cf6` (violet) & `#3b82f6` (blue gradients).
- **Status Indicators**:
  - Emerald (`#22c55e`) for saved expenses.
  - Amber (`#f59e0b`) for scheduled reminders.
  - Rose (`#ef4444`) for active mic listening & deletions.
  - Cyan (`#06b6d4`) for analytics queries.

---

## Directory Structure

```
frontend/
├── src/
│   ├── main.jsx                  # Entry point with BrowserRouter
│   ├── App.jsx                   # Layout wrap & route definitions
│   ├── index.css                 # Custom waveform keyframes & scrollbars
│   ├── components/
│   │   ├── MicButton.jsx         # Large animated multi-state microphone
│   │   ├── WaveformAnimation.jsx # Live listening audio bar animation
│   │   ├── StatCard.jsx          # Glass-morphic metric card
│   │   ├── CategoryBadge.jsx     # Distinct colored category tags
│   │   ├── ExpenseForm.jsx       # Modal for manual add / edit
│   │   ├── ConfirmDialog.jsx     # Reusable action confirmation modal
│   │   ├── Sidebar.jsx           # Responsive desktop & mobile navigation
│   │   ├── Layout.jsx            # Layout scaffold
│   │   └── Toast.jsx             # Toast notification renderer
│   ├── context/
│   │   └── ToastContext.jsx      # Global toast management
│   ├── hooks/
│   │   └── useVoice.js           # Browser SpeechRecognition & SpeechSynthesis hook
│   ├── pages/
│   │   ├── Dashboard.jsx         # Overview metrics, charts & Quick Voice
│   │   ├── Assistant.jsx         # Dedicated Hero Voice Engine with history
│   │   ├── Expenses.jsx          # Full expense ledger with filters
│   │   ├── Tasks.jsx             # Tasks & Reminders with 30s polling
│   │   └── Settings.jsx          # Honesty Panel & Demo Seed controls
│   └── services/
│       └── api.js                # Axios client targeting backend /api routes
├── index.html
├── vite.config.js                # Local proxy to port 5000
├── tailwind.config.js
└── package.json
```

---

## The Voice Interface State Machine

The voice interface (`useVoice.js`) handles 5 reactive states:

1. **`idle`**: Purple gradient mic with subtle breathing pulse. Ready for interaction.
2. **`listening`**: Red animated concentric rings with audio waveform bars. Transcribes speech in real-time.
3. **`thinking`**: Cyan spinner indicates backend Gemini processing & database transaction.
4. **`speaking`**: Green pulsing indicator as the browser speaks the confirmation aloud. (Microphone is automatically muted to prevent acoustic feedback).
5. **`error`**: Clear visual error feedback with 1-click retry.

---

## Multilingual Voice Support

- **English (India) (`en-IN`)**: Understands colloquial Indian financial phrasing ("Spent 250 rupees on auto", "Canteen lunch", "Recharge bill").
- **Hindi (India) (`hi-IN`)**: Full speech recognition and spoken feedback in Hindi ("दोपहर के खाने पर 250 रुपये खर्च किए").

---

## Proactive Reminder Polling

The `Tasks.jsx` page mounts a 30-second polling interval against `/api/reminders/due`. When a scheduled reminder reaches its due timestamp, the app:
1. Shows an immediate toast notification.
2. Triggers the browser `Notification` API (if permission is granted).
3. The backend marks the reminder as `notified: true` in PostgreSQL to prevent duplicate alerts.
