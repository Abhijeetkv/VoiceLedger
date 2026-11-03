import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import prisma from './lib/prisma.js';
import { errorHandler } from './middleware/errorHandler.js';
import expensesRouter from './routes/expenses.js';
import tasksRouter, { remindersRouter } from './routes/tasks.js';
import voiceRouter from './routes/voice.js';
import summaryRouter from './routes/summary.js';
import demoRouter from './routes/demo.js';
import authRouter from './routes/auth.js';

const app = express();
const PORT = process.env.PORT || 5000;

// --- Bulletproof CORS Middleware ---
// Ensures Access-Control-Allow-Origin is set on every request, preflight, and error
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(express.json({ limit: '1mb' }));

// --- Root Status Route ---
app.get(['/', '/api'], (req, res) => {
  res.json({
    name: 'VoiceLedger API',
    status: 'online',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// --- Health Check ---
app.get(['/health', '/api/health'], (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// --- Config Status (no keys exposed) ---
app.get(['/config/status', '/api/config/status'], (req, res) => {
  res.json({
    database: !!process.env.DATABASE_URL,
    gemini: !!process.env.GEMINI_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    resend: !!process.env.RESEND_API_KEY,
    aiProvider: process.env.AI_PROVIDER || 'gemini',
    emailFrom: process.env.EMAIL_FROM || 'onboarding@resend.dev',
    nodeEnv: process.env.NODE_ENV || 'development',
  });
});

// --- Route Mounts (Support both /api/* and direct /* paths) ---
app.use(['/api/auth', '/auth'], authRouter);
app.use(['/api/expenses', '/expenses'], expensesRouter);
app.use(['/api/tasks', '/tasks'], tasksRouter);
app.use(['/api/reminders', '/reminders'], remindersRouter);
app.use(['/api/voice-command', '/voice-command'], voiceRouter);
app.use(['/api/summary', '/summary'], summaryRouter);
app.use(['/api/demo', '/demo'], demoRouter);

// --- 404 Handler ---
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.path}` });
});

// --- Global Error Handler ---
app.use(errorHandler);

// --- Standalone Server (only started outside Vercel serverless environment) ---
if (!process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`VoiceLedger server running on http://localhost:${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   AI Provider: ${process.env.AI_PROVIDER || 'gemini'}`);
    console.log(`   Gemini: ${process.env.GEMINI_API_KEY ? 'configured' : 'not configured'}`);
    console.log(`   Resend: ${process.env.RESEND_API_KEY ? 'configured' : 'mock mode'}`);
  });

  async function shutdown(signal) {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await prisma.$disconnect();
      console.log('Database disconnected. Goodbye!');
      process.exit(0);
    });
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

export default app;
