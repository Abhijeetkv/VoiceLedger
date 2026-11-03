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

// --- Middleware ---
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

// --- Health Check ---
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// --- Config Status (no keys exposed) ---
app.get('/api/config/status', (req, res) => {
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

// --- Route Mounts ---
app.use('/api/auth', authRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/reminders', remindersRouter);
app.use('/api/voice-command', voiceRouter);
app.use('/api/summary', summaryRouter);
app.use('/api/demo', demoRouter);

// --- 404 handler ---
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.path}` });
});

// --- Global Error Handler ---
app.use(errorHandler);

// --- Start Server ---
const server = app.listen(PORT, () => {
  console.log(`VoiceLedger server running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   AI Provider: ${process.env.AI_PROVIDER || 'gemini'}`);
  console.log(`   Gemini: ${process.env.GEMINI_API_KEY ? 'configured' : 'not configured'}`);
  console.log(`   Resend: ${process.env.RESEND_API_KEY ? 'configured' : 'mock mode'}`);
});

// --- Graceful Shutdown ---
async function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log('Database disconnected. Goodbye!');
    process.exit(0);
  });
  // Force exit after 10s
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

