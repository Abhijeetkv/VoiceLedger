import { useState, useEffect, useRef } from 'react';
import {
  Mic, Send, Sparkles, AlertCircle, RefreshCw, Volume2,
  CheckCircle2, AlertTriangle, ArrowRight, CornerDownLeft,
  Calendar, CheckSquare, IndianRupee, Mail, Trash2, HelpCircle
} from 'lucide-react';
import MicButton from '../components/MicButton.jsx';
import WaveformAnimation from '../components/WaveformAnimation.jsx';
import { useVoice } from '../hooks/useVoice.js';
import { sendVoiceCommand } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';

const SAMPLE_COMMANDS = [
  'I spent 250 rupees on lunch',
  'Remind me to submit my assignment tomorrow',
  'I spent 250 rupees on lunch and remind me to submit my college form on Friday',
  'How much did I spend this week?',
  'Email my weekly spending summary to my email address',
  'Delete my last expense',
];

export default function Assistant() {
  const voice = useVoice();
  const toast = useToast();
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('voiceledger_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const chatBottomRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem('voiceledger_history', JSON.stringify(history.slice(-20)));
    } catch (e) {
      console.error(e);
    }
  }, [history]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, voice.transcript]);

  // When speech recognition ends and we have a transcript in listening mode
  const handleMicClick = () => {
    if (voice.state === 'listening') {
      voice.stopListening();
      if (voice.transcript.trim()) {
        executeCommand(voice.transcript);
      } else {
        voice.reset();
      }
    } else if (voice.state === 'speaking') {
      voice.stopSpeaking();
    } else {
      voice.startListening();
    }
  };

  const executeCommand = async (commandText) => {
    const text = commandText.trim();
    if (!text) return;

    voice.setState('thinking');
    setIsProcessing(true);

    const userEntry = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setHistory((prev) => [...prev, userEntry]);
    setTextInput('');

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
      const currentDateISO = new Date().toISOString();
      const savedEmail = localStorage.getItem('voiceledger_email') || '';

      const response = await sendVoiceCommand({
        transcript: text,
        timezone,
        currentDateISO,
        language: voice.language,
        userEmail: savedEmail,
      });

      const { spokenReply, actions = [], results = [] } = response.data;

      const aiEntry = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: spokenReply || 'Action completed.',
        actions,
        results,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setHistory((prev) => [...prev, aiEntry]);

      // Speak response
      if (spokenReply) {
        await voice.speak(spokenReply);
      } else {
        voice.setState('idle');
      }

      toast.success('Command executed successfully');
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || err.message || 'Failed to process voice command';
      
      voice.setError(errMsg);
      voice.setState('error');
      
      const errorEntry = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: `Error: ${errMsg}. Please try again.`,
        isError: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setHistory((prev) => [...prev, errorEntry]);
      toast.error(errMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (!textInput.trim() || isProcessing) return;
    executeCommand(textInput);
  };

  const getActionBadge = (action, result) => {
    const isSuccess = result?.success !== false;
    switch (action.type) {
      case 'ADD_EXPENSE':
        return (
          <div key={Math.random()} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <IndianRupee className="w-3.5 h-3.5" />
            <span>₹{action.amount} ({action.category})</span>
          </div>
        );
      case 'ADD_REMINDER':
        return (
          <div key={Math.random()} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
            <Calendar className="w-3.5 h-3.5" />
            <span>Reminder: {action.title}</span>
          </div>
        );
      case 'ADD_TASK':
        return (
          <div key={Math.random()} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Task: {action.title}</span>
          </div>
        );
      case 'SEND_EMAIL':
        return (
          <div key={Math.random()} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200">
            <Mail className="w-3.5 h-3.5" />
            <span>Email {result?.data?.mock ? '(Mock)' : 'Sent'}</span>
          </div>
        );
      case 'DELETE_LAST':
        return (
          <div key={Math.random()} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <Trash2 className="w-3.5 h-3.5" />
            <span>Deleted Expense</span>
          </div>
        );
      case 'QUERY_SUMMARY':
        return (
          <div key={Math.random()} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-cyan-50 text-cyan-800 border border-cyan-200">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Spending Summary ({action.period})</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">AI Voice Assistant</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-violet-50 text-violet-700 border border-violet-200">
              Live Engine
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Speak naturally to log expenses, create tasks, set reminders, and query analytics.
          </p>
        </div>

        {/* Language selector */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => voice.setLanguage('en-IN')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              voice.language === 'en-IN'
                ? 'bg-white text-violet-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            English (India)
          </button>
          <button
            type="button"
            onClick={() => voice.setLanguage('hi-IN')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              voice.language === 'hi-IN'
                ? 'bg-white text-violet-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Hindi (हिंदी)
          </button>
        </div>
      </div>

      {/* Browser Speech API Warning if unsupported */}
      {!voice.isSupported && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-900">Speech Recognition Not Supported in this Browser</p>
            <p className="text-amber-700 mt-0.5">
              Please use <strong>Google Chrome</strong> or Microsoft Edge for the best experience with the Web Speech API. You can still use the text input below!
            </p>
          </div>
        </div>
      )}

      {/* Hero Voice Center */}
      <div className="relative overflow-hidden bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-12 text-center shadow-xs">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-violet-100/40 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col items-center justify-center">
          <MicButton
            state={voice.state}
            onClick={handleMicClick}
            size="lg"
          />

          {/* Dynamic Status / Waveform */}
          <div className="mt-6 min-h-[50px] flex flex-col items-center justify-center">
            {voice.state === 'listening' ? (
              <div className="space-y-2">
                <WaveformAnimation />
                <p className="text-sm font-semibold text-rose-600 animate-pulse">
                  Listening... Click again or pause when finished
                </p>
              </div>
            ) : voice.state === 'thinking' ? (
              <div className="flex items-center gap-2 text-violet-700 text-sm font-medium">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>AI is extracting actions and updating database...</span>
              </div>
            ) : voice.state === 'speaking' ? (
              <div className="flex items-center gap-2 text-emerald-700 text-sm font-medium">
                <Volume2 className="w-4 h-4 animate-bounce" />
                <span>Speaking reply... Click mic to stop</span>
              </div>
            ) : voice.state === 'error' ? (
              <p className="text-sm text-rose-600 font-medium">
                {voice.error || 'Error occurred. Tap to retry.'}
              </p>
            ) : (
              <p className="text-sm text-slate-500 font-medium">
                Click microphone and speak your expenses or tasks
              </p>
            )}

            {/* Live interim transcript display */}
            {voice.transcript && (
              <div className="mt-3 px-4 py-2 bg-slate-50 rounded-full border border-slate-200 max-w-xl text-sm text-slate-800 font-medium shadow-xs animate-fade-in">
                "{voice.transcript}"
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Suggested Quick Prompts */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2.5 px-1">
          Demo Voice Commands (Click to test)
        </p>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_COMMANDS.map((cmd) => (
            <button
              key={cmd}
              type="button"
              onClick={() => executeCommand(cmd)}
              disabled={isProcessing}
              className="text-xs text-left px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-violet-300 transition-all flex items-center gap-2 disabled:opacity-50 shadow-2xs font-medium"
            >
              <span>"{cmd}"</span>
              <ArrowRight className="w-3 h-3 text-violet-600 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Conversation History */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-600" />
            Voice Command Activity
          </h2>
          {history.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setHistory([]);
                localStorage.removeItem('voiceledger_history');
              }}
              className="text-xs text-slate-400 hover:text-rose-600 font-medium transition-colors"
            >
              Clear Log
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm">
            No commands yet. Use the microphone or try one of the suggestions above.
          </div>
        ) : (
          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
            {history.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 text-sm ${
                    msg.role === 'user'
                      ? 'bg-violet-600 text-white rounded-br-xs shadow-xs'
                      : msg.isError
                      ? 'bg-rose-50 text-rose-900 border border-rose-200 rounded-bl-xs'
                      : 'bg-slate-50 text-slate-800 border border-slate-200 rounded-bl-xs shadow-2xs'
                  }`}
                >
                  <p className="leading-relaxed">{msg.text}</p>

                  {/* Actions summary badges if available */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex flex-wrap gap-1.5">
                      {msg.actions.map((act, idx) => getActionBadge(act, msg.results?.[idx]))}
                    </div>
                  )}

                  <span className={`block text-[10px] mt-1.5 text-right ${
                    msg.role === 'user' ? 'text-violet-200' : 'text-slate-400'
                  }`}>
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>
        )}
      </div>

      {/* Text Input Fallback Bar */}
      <form onSubmit={handleTextSubmit} className="relative flex items-center">
        <input
          type="text"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="Or type a command here... (e.g. 'Spent 500 on dinner')"
          disabled={isProcessing}
          className="w-full bg-white text-slate-900 placeholder-slate-400 text-sm rounded-2xl pl-4 pr-24 py-3.5 border border-slate-200 focus:outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-600/10 shadow-xs transition-all disabled:opacity-50"
        />
        <div className="absolute right-2 flex items-center gap-1.5">
          <button
            type="submit"
            disabled={!textInput.trim() || isProcessing}
            className="p-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white transition-all shadow-xs"
            title="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
