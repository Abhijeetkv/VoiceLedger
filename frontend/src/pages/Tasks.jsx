import { useState, useEffect, useRef } from 'react';
import {
  Plus, Trash2, CheckCircle, Circle, Clock, ListTodo,
  Loader2, Bell, CalendarClock,
} from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { getTasks, createTask, updateTask, deleteTask, getDueReminders } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';

function getDueBadge(dueDate) {
  if (!dueDate) return null;
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-medium">Overdue</span>;
  }
  if (diffDays === 0) {
    return <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-medium">Due today</span>;
  }
  if (diffDays <= 3) {
    return <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">In {diffDays}d</span>;
  }
  return <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">In {diffDays}d</span>;
}

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', dueDate: '' });
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const pollRef = useRef(null);

  useEffect(() => {
    fetchAll();

    // Poll due reminders every 30s
    pollRef.current = setInterval(checkDueReminders, 30000);
    return () => clearInterval(pollRef.current);
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [taskRes, reminderRes] = await Promise.all([
        getTasks({ type: 'TASK' }),
        getTasks({ type: 'REMINDER' }),
      ]);
      setTasks(taskRes.data?.data || taskRes.data?.tasks || (Array.isArray(taskRes.data) ? taskRes.data : []));
      setReminders(reminderRes.data?.data || reminderRes.data?.tasks || (Array.isArray(reminderRes.data) ? reminderRes.data : []));
    } catch (err) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const checkDueReminders = async () => {
    try {
      const res = await getDueReminders();
      const due = res.data?.data || res.data?.reminders || (Array.isArray(res.data) ? res.data : []);
      if (due.length > 0) {
        due.forEach((r) => {
          toast.warning(`Reminder: ${r.title}`);
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('VoiceLedger Reminder', { body: r.title });
          }
        });
      }
    } catch {
      // silent
    }
  };

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleAdd = async (type) => {
    if (!newItem.title.trim()) {
      toast.error('Title is required');
      return;
    }
    setSubmitting(true);
    try {
      const taskType = type === 'reminder' ? 'REMINDER' : 'TASK';
      const formattedDate = newItem.dueDate ? new Date(newItem.dueDate).toISOString() : null;

      await createTask({
        title: newItem.title.trim(),
        type: taskType,
        dueDate: formattedDate,
      });

      toast.success(`${type === 'task' ? 'Task' : 'Reminder'} added!`);
      setNewItem({ title: '', dueDate: '' });
      setShowAddTask(false);
      setShowAddReminder(false);
      await fetchAll();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.details?.[0]?.message || `Failed to add ${type}`;
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (item) => {
    const id = item.id || item._id;
    const newCompleted = !item.completed;

    // Optimistic UI update
    setTasks((prev) => prev.map((t) => ((t.id || t._id) === id ? { ...t, completed: newCompleted } : t)));
    setReminders((prev) => prev.map((r) => ((r.id || r._id) === id ? { ...r, completed: newCompleted } : r)));

    try {
      await updateTask(id, { completed: newCompleted });
    } catch (err) {
      toast.error('Failed to update status');
      fetchAll();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id || deleteTarget._id;

    // Optimistic UI update
    setTasks((prev) => prev.filter((t) => (t.id || t._id) !== id));
    setReminders((prev) => prev.filter((r) => (r.id || r._id) !== id));

    try {
      await deleteTask(id);
      toast.success('Deleted successfully');
      setDeleteTarget(null);
    } catch (err) {
      toast.error('Failed to delete item');
      fetchAll();
    }
  };

  const renderAddForm = (type) => (
    <div className="flex flex-col sm:flex-row gap-2 mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
      <input
        type="text"
        value={newItem.title}
        onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
        placeholder={type === 'task' ? 'What needs to be done?' : 'Remind me to...'}
        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-600/10 transition-all"
        onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(type); }}
      />
      <input
        type="datetime-local"
        value={newItem.dueDate}
        onChange={(e) => setNewItem({ ...newItem, dueDate: e.target.value })}
        className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-600/10 transition-all"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleAdd(type)}
          disabled={submitting}
          className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-all disabled:opacity-50 whitespace-nowrap shadow-xs"
        >
          {submitting ? 'Adding...' : 'Add'}
        </button>
        <button
          type="button"
          onClick={() => { setShowAddTask(false); setShowAddReminder(false); setNewItem({ title: '', dueDate: '' }); }}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-sm font-medium transition-all whitespace-nowrap"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  const renderList = (items, type) => (
    <div className="space-y-1 divide-y divide-slate-100">
      {items.length > 0 ? (
        items.map((item) => (
          <div
            key={item._id || item.id}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group ${
              item.completed ? 'opacity-60' : ''
            }`}
          >
            <button
              onClick={() => handleToggle(item)}
              className="flex-shrink-0 transition-colors"
            >
              {item.completed ? (
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              ) : (
                <Circle className="w-5 h-5 text-slate-300 hover:text-violet-600" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${item.completed ? 'line-through text-slate-400' : 'text-slate-900 font-medium'}`}>
                {item.title}
              </p>
              {item.dueDate && (
                <p className="text-xs text-slate-500 mt-0.5">
                  {new Date(item.dueDate).toLocaleString('en-IN', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              )}
            </div>
            {!item.completed && getDueBadge(item.dueDate)}
            <button
              onClick={() => setDeleteTarget(item)}
              className="flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-slate-400">
          {type === 'task' ? (
            <ListTodo className="w-8 h-8 mb-2 text-slate-300" />
          ) : (
            <Bell className="w-8 h-8 mb-2 text-slate-300" />
          )}
          <p className="text-sm font-medium">No {type}s yet</p>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tasks & Reminders</h1>
        <p className="text-slate-500 text-sm">Manage your to-dos and set reminders</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-violet-600" />
              <h2 className="text-lg font-semibold text-slate-900">Tasks</h2>
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                {tasks.filter((t) => !t.completed).length} active
              </span>
            </div>
            <button
              onClick={() => { setShowAddTask(!showAddTask); setShowAddReminder(false); setNewItem({ title: '', dueDate: '' }); }}
              className="flex items-center gap-1 text-sm font-semibold text-violet-600 hover:text-violet-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
          {showAddTask && renderAddForm('task')}
          {renderList(tasks, 'task')}
        </div>

        {/* Reminders */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-slate-900">Reminders</h2>
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                {reminders.filter((r) => !r.completed).length} active
              </span>
            </div>
            <button
              onClick={() => { setShowAddReminder(!showAddReminder); setShowAddTask(false); setNewItem({ title: '', dueDate: '' }); }}
              className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
          {showAddReminder && renderAddForm('reminder')}
          {renderList(reminders, 'reminder')}
        </div>
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Item"
          message={`Delete "${deleteTarget.title}"?`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
