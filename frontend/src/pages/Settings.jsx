import { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon, Database, Bot, Mail, Mic, Volume2,
  Server, ShieldCheck, RefreshCw, AlertTriangle, CheckCircle2,
  Trash2, Download, Save, Info
} from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { getConfigStatus, seedDemoData, resetDemoData, getHealth } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';

export default function Settings() {
  const toast = useToast();
  const [config, setConfig] = useState(null);
  const [health, setHealth] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [emailTo, setEmailTo] = useState(() => localStorage.getItem('voiceledger_email') || '');
  const [isSeeding, setIsSeeding] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Client speech capability checks
  const speechRecognitionAvailable = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  const speechSynthesisAvailable = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setLoadingConfig(true);
    try {
      const [cfgRes, healthRes] = await Promise.all([
        getConfigStatus().catch((err) => ({ data: { error: err.message } })),
        getHealth().catch((err) => ({ data: { error: err.message } })),
      ]);
      setConfig(cfgRes.data);
      setHealth(healthRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleSaveEmail = (e) => {
    e.preventDefault();
    localStorage.setItem('voiceledger_email', emailTo.trim());
    toast.success('Recipient email saved to settings');
  };

  const handleSeedDemo = async () => {
    setIsSeeding(true);
    try {
      const res = await seedDemoData();
      toast.success(res.data?.message || 'Demo data loaded successfully');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to seed demo data');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleResetData = async () => {
    setIsResetting(true);
    setShowResetConfirm(false);
    try {
      await resetDemoData();
      toast.success('All data has been reset');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reset data');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-10">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2.5">
          <SettingsIcon className="w-7 h-7 text-violet-400" />
          Settings & System Diagnostics
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Configure preferences, inspect actual integration health, and manage sample data.
        </p>
      </div>

      {/* Honesty Panel (Requirement Section 13) */}
      <div className="bg-[#1a1f3a]/60 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-white">Honesty Panel (Live Integration Status)</h2>
          </div>
          <button
            onClick={fetchStatus}
            disabled={loadingConfig}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Refresh status"
          >
            <RefreshCw className={`w-4 h-4 ${loadingConfig ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-3 mb-5">
          This panel displays real runtime verification of every integration layer — no mock claims.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* AI Provider */}
          <div className="p-4 rounded-xl bg-[#0f1225]/80 border border-white/5 flex items-start gap-3">
            <Bot className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">AI Engine</span>
                {config?.gemini ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Gemini Live
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-amber-400 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" /> Key Required
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Provider: <span className="text-gray-300 font-mono">{config?.aiProvider || 'gemini'}</span> (Official @google/genai SDK)
              </p>
            </div>
          </div>

          {/* Database & Prisma */}
          <div className="p-4 rounded-xl bg-[#0f1225]/80 border border-white/5 flex items-start gap-3">
            <Database className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Database & ORM</span>
                {config?.database ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> PostgreSQL + Prisma
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-rose-400 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" /> Not Connected
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Prisma ORM with Decimal-safe calculations on Neon PostgreSQL
              </p>
            </div>
          </div>

          {/* Email Integration */}
          <div className="p-4 rounded-xl bg-[#0f1225]/80 border border-white/5 flex items-start gap-3">
            <Mail className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Email Service</span>
                {config?.resend ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Resend REAL
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-amber-400 font-medium">
                    <Info className="w-3.5 h-3.5" /> Resend MOCK Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Sender: <span className="text-gray-300 font-mono">{config?.emailFrom || 'onboarding@resend.dev'}</span>
              </p>
            </div>
          </div>

          {/* Backend Server */}
          <div className="p-4 rounded-xl bg-[#0f1225]/80 border border-white/5 flex items-start gap-3">
            <Server className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Backend Server</span>
                {health?.status === 'ok' ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Express Online
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-rose-400 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" /> Offline
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Node.js ES Modules with Zod schema validation
              </p>
            </div>
          </div>

          {/* Web Speech API Recognition */}
          <div className="p-4 rounded-xl bg-[#0f1225]/80 border border-white/5 flex items-start gap-3">
            <Mic className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Speech Recognition</span>
                {speechRecognitionAvailable ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Web Speech API
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-amber-400 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" /> Unsupported
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Browser Native Recognition (English en-IN & Hindi hi-IN)
              </p>
            </div>
          </div>

          {/* Speech Synthesis */}
          <div className="p-4 rounded-xl bg-[#0f1225]/80 border border-white/5 flex items-start gap-3">
            <Volume2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Voice Response</span>
                {speechSynthesisAvailable ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> SpeechSynthesis
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-amber-400 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" /> Unsupported
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Browser Native TTS audio output with anti-feedback loop
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Email Settings for Demo */}
      <div className="bg-[#1a1f3a]/60 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-2">
          <Mail className="w-5 h-5 text-amber-400" />
          Email Configuration for Live Demo
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          When you say "Email my spending summary to my email", VoiceLedger will dispatch to this recipient.
        </p>

        <form onSubmit={handleSaveEmail} className="flex flex-col sm:flex-row gap-3 max-w-xl">
          <input
            type="email"
            value={emailTo}
            onChange={(e) => setEmailTo(e.target.value)}
            placeholder="e.g. your-email@domain.com"
            className="flex-1 bg-[#0f1225] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Email
          </button>
        </form>
      </div>

      {/* Demo Data Management */}
      <div className="bg-[#1a1f3a]/60 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
        <h2 className="text-lg font-semibold text-white mb-2">Hackathon Demo Controls</h2>
        <p className="text-xs text-gray-400 mb-5">
          Quickly populate or reset the PostgreSQL database with realistic sample transactions, tasks, and reminders for jury presentation.
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={handleSeedDemo}
            disabled={isSeeding}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isSeeding ? 'Seeding Database...' : 'Load Realistic Demo Data'}
          </button>

          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            disabled={isResetting}
            className="px-5 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            {isResetting ? 'Resetting...' : 'Reset All Database Records'}
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showResetConfirm}
        title="Reset All Data?"
        message="This will permanently delete all expenses, tasks, reminders, and voice command history from PostgreSQL. Are you sure you want to proceed?"
        confirmLabel="Yes, Reset Everything"
        onConfirm={handleResetData}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
}

