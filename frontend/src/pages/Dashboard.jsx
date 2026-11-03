import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IndianRupee, TrendingUp, CalendarDays, ReceiptText,
  Clock, ArrowRight, Loader2, Sparkles
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import StatCard from '../components/StatCard.jsx';
import CategoryBadge from '../components/CategoryBadge.jsx';
import MicButton from '../components/MicButton.jsx';
import { getSummary, getExpenses, getTasks, sendVoiceCommand } from '../services/api.js';
import { useVoice } from '../hooks/useVoice.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const formatCurrency = (amt) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amt || 0);

const chartColors = [
  '#7c3aed', '#3b82f6', '#f59e0b', '#ef4444', '#10b981',
  '#ec4899', '#06b6d4', '#8b5cf6', '#f97316', '#14b8a6',
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const [summaries, setSummaries] = useState({ today: null, week: null, month: null, all: null });
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const navigate = useNavigate();
  const voice = useVoice();
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [todayRes, weekRes, monthRes, allRes, expRes, taskRes] = await Promise.all([
        getSummary('today'),
        getSummary('week'),
        getSummary('month'),
        getSummary('all'),
        getExpenses({ limit: 10 }),
        getTasks({ type: 'REMINDER', completed: false }),
      ]);
      setSummaries({
        today: todayRes.data?.data || todayRes.data,
        week: weekRes.data?.data || weekRes.data,
        month: monthRes.data?.data || monthRes.data,
        all: allRes.data?.data || allRes.data,
      });
      setRecentExpenses(expRes.data?.data || expRes.data?.expenses || (Array.isArray(expRes.data) ? expRes.data : []));
      const taskList = taskRes.data?.data || taskRes.data?.tasks || (Array.isArray(taskRes.data) ? taskRes.data : []);
      setUpcomingTasks(taskList.slice(0, 5));
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const processQuickVoice = async (text) => {
    const transcriptText = text.trim();
    if (!transcriptText) return;

    voice.setState('thinking');
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
      const savedEmail = localStorage.getItem('voiceledger_email') || '';
      const res = await sendVoiceCommand({
        transcript: transcriptText,
        timezone,
        currentDateISO: new Date().toISOString(),
        language: voice.language,
        userEmail: savedEmail,
      });

      const { spokenReply } = res.data;
      if (spokenReply) {
        await voice.speak(spokenReply);
      } else {
        voice.setState('idle');
      }

      toast.success('Action executed!');
      fetchData();
    } catch (err) {
      voice.setState('error');
      toast.error(err.response?.data?.error || err.message || 'Voice command failed');
    }
  };

  const handleMicClick = async () => {
    if (voice.state === 'listening') {
      voice.stopListening();
      if (voice.transcript.trim()) {
        await processQuickVoice(voice.transcript);
      }
      return;
    }
    if (voice.state === 'speaking') {
      voice.stopSpeaking();
      return;
    }
    voice.startListening();
  };

  // Build category chart from month summary
  const categoryData = Array.isArray(summaries.month?.byCategory)
    ? summaries.month.byCategory.map((item) => ({
        name: item.category,
        amount: Number(item.total) || 0,
      }))
    : summaries.month?.byCategory
    ? Object.entries(summaries.month.byCategory).map(([name, value]) => ({
        name: typeof value === 'object' && value.category ? value.category : name,
        amount: typeof value === 'object' ? Number(value.total) || 0 : Number(value) || 0,
      }))
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-80">
        <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
      </div>
    );
  }

  const userName = user?.name ? user.name.split(' ')[0] : 'User';

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {getGreeting()}, {userName}
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <button
          onClick={() => navigate('/assistant')}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-xs shadow-violet-600/30 transition-all"
        >
          <Sparkles className="w-4 h-4" />
          <span>Launch AI Assistant</span>
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          icon={<IndianRupee className="w-5 h-5" />}
          label="Today's Spending"
          value={formatCurrency(summaries.today?.totalAmount || 0)}
          subtext={`${summaries.today?.count || 0} transaction(s)`}
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Weekly Spending"
          value={formatCurrency(summaries.week?.totalAmount || 0)}
          subtext={`${summaries.week?.count || 0} transaction(s)`}
        />
        <StatCard
          icon={<CalendarDays className="w-5 h-5" />}
          label="Monthly Spending"
          value={formatCurrency(summaries.month?.totalAmount || 0)}
          subtext={`${summaries.month?.count || 0} transaction(s)`}
        />
        <StatCard
          icon={<ReceiptText className="w-5 h-5" />}
          label="Total Transactions"
          value={summaries.all?.count || 0}
          subtext={`All time: ${formatCurrency(summaries.all?.totalAmount || 0)}`}
        />
      </div>

      {/* Main Grid: Chart + Quick Voice */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Monthly Spending by Category</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Calculated in real-time from PostgreSQL</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">This Month</span>
          </div>

          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={categoryData} margin={{ top: 10, right: 10, bottom: 5, left: -10 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    color: '#0f172a',
                    fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                  }}
                  formatter={(value) => [formatCurrency(value), 'Spent']}
                />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={chartColors[i % chartColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-52 text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <p className="text-sm font-medium">No expense records found this month.</p>
              <p className="text-xs text-slate-400 mt-1">Speak to log your first transaction!</p>
            </div>
          )}
        </div>

        {/* Quick Voice Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col items-center justify-center text-center">
          <div className="mb-2">
            <h3 className="text-base font-bold text-slate-900">Quick Voice</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Tap mic and say &ldquo;Spent 200 on lunch&rdquo;
            </p>
          </div>

          <div className="my-4">
            <MicButton state={voice.state} onClick={handleMicClick} size="sm" />
          </div>

          {voice.transcript && (
            <p className="text-xs font-semibold text-slate-800 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200 max-w-xs truncate mb-2">
              &ldquo;{voice.transcript}&rdquo;
            </p>
          )}

          <button
            onClick={() => navigate('/assistant')}
            className="flex items-center gap-1.5 text-xs font-bold text-violet-600 hover:text-violet-700 transition-colors mt-2"
          >
            <span>Open full AI Assistant</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tables Section: Recent Transactions & Upcoming Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">Recent Transactions</h3>
            <button
              onClick={() => navigate('/expenses')}
              className="text-xs font-bold text-violet-600 hover:text-violet-700 transition-colors flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentExpenses.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {recentExpenses.map((exp) => (
                <div
                  key={exp._id || exp.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <p className="text-sm font-semibold text-slate-900 truncate">{exp.note || 'Expense'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <CategoryBadge category={exp.category} />
                      <span className="text-xs font-medium text-slate-400">
                        {new Date(exp.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-slate-900">
                    {formatCurrency(exp.amount)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-10 text-slate-400 text-sm font-medium">
              No transactions recorded yet.
            </div>
          )}
        </div>

        {/* Upcoming Reminders */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">Upcoming Reminders</h3>
            <button
              onClick={() => navigate('/tasks')}
              className="text-xs font-bold text-violet-600 hover:text-violet-700 transition-colors flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {upcomingTasks.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {upcomingTasks.map((task) => {
                const dueDate = task.dueDate ? new Date(task.dueDate) : null;
                const now = new Date();
                let dueBadge = null;
                if (dueDate) {
                  const diffMs = dueDate - now;
                  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                  if (diffDays < 0) {
                    dueBadge = <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">Overdue</span>;
                  } else if (diffDays === 0) {
                    dueBadge = <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">Due today</span>;
                  } else {
                    dueBadge = <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">In {diffDays}d</span>;
                  }
                }
                return (
                  <div
                    key={task._id || task.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-3">
                      <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{task.title}</p>
                        {dueDate && (
                          <p className="text-xs font-medium text-slate-400 mt-0.5">
                            {dueDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </div>
                    {dueBadge}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center py-10 text-slate-400 text-sm font-medium">
              No upcoming reminders found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
