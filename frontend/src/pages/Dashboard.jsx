import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IndianRupee, TrendingUp, CalendarDays, ReceiptText,
  Mic, Clock, ArrowRight, Loader2,
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

const formatCurrency = (amt) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amt || 0);

const chartColors = [
  '#8b5cf6', '#3b82f6', '#f59e0b', '#ef4444', '#22c55e',
  '#ec4899', '#06b6d4', '#a855f7', '#f97316', '#14b8a6',
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
    } catch (err) {
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
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">
          {getGreeting()}, User
        </h1>
        <p className="text-gray-500 mt-1">
          {new Date().toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Chart */}
        <div className="lg:col-span-2 bg-[#1a1f3a]/60 backdrop-blur-sm border border-white/5 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Monthly Spending by Category</h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={categoryData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: '#1a1f3a',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                  formatter={(value) => [formatCurrency(value), 'Amount']}
                />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={chartColors[i % chartColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-500">
              <p>No expense data this month. Start tracking!</p>
            </div>
          )}
        </div>

        {/* Quick Voice */}
        <div className="bg-[#1a1f3a]/60 backdrop-blur-sm border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center gap-4">
          <h3 className="text-lg font-semibold text-white">Quick Voice</h3>
          <p className="text-sm text-gray-500 text-center">Tap the mic and say something like<br />&ldquo;Spent 200 on lunch&rdquo;</p>
          <MicButton state={voice.state} onClick={handleMicClick} size="sm" />
          {voice.transcript && (
            <p className="text-sm text-gray-300 text-center italic">&ldquo;{voice.transcript}&rdquo;</p>
          )}
          <button
            onClick={() => navigate('/assistant')}
            className="flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300 transition-colors"
          >
            Open full assistant <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-[#1a1f3a]/60 backdrop-blur-sm border border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Recent Transactions</h3>
            <button
              onClick={() => navigate('/expenses')}
              className="text-sm text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {recentExpenses.length > 0 ? (
            <div className="space-y-3">
              {recentExpenses.map((exp) => (
                <div
                  key={exp._id || exp.id}
                  className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{exp.note || 'No note'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <CategoryBadge category={exp.category} />
                      <span className="text-xs text-gray-500">
                        {new Date(exp.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-white ml-4">
                    {formatCurrency(exp.amount)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
              No transactions yet. Add one with voice!
            </div>
          )}
        </div>

        {/* Upcoming Reminders */}
        <div className="bg-[#1a1f3a]/60 backdrop-blur-sm border border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Upcoming Reminders</h3>
            <button
              onClick={() => navigate('/tasks')}
              className="text-sm text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {upcomingTasks.length > 0 ? (
            <div className="space-y-3">
              {upcomingTasks.map((task) => {
                const dueDate = task.dueDate ? new Date(task.dueDate) : null;
                const now = new Date();
                let dueBadge = null;
                if (dueDate) {
                  const diffMs = dueDate - now;
                  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                  if (diffDays < 0) {
                    dueBadge = <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">Overdue</span>;
                  } else if (diffDays === 0) {
                    dueBadge = <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400">Due today</span>;
                  } else {
                    dueBadge = <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400">In {diffDays}d</span>;
                  }
                }
                return (
                  <div
                    key={task._id || task.id}
                    className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Clock className="w-4 h-4 text-violet-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-white truncate">{task.title}</p>
                        {dueDate && (
                          <p className="text-xs text-gray-500">
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
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
              No upcoming reminders. Create one!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
