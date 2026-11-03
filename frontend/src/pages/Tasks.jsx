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
    return <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 font-medium">Overdue</span>;
  }
  if (diffDays === 0) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 font-medium">Due today</span>;
  }
  if (diffDays <= 3) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 font-medium">In {diffDays}d</span>;
  }
  return <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 font-medium">In {diffDays}d</span>;
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
      await createTask({
        title: newItem.title,
        type,
        dueDate: newItem.dueDate || undefined,
      });
      toast.success(`${type === 'task' ? 'Task' : 'Reminder'} added!`);
      setNewItem({ title: '', dueDate: '' });
      setShowAddTask(false);
      setShowAddReminder(false);
      fetchAll();
    } catch (err) {
      toast.error(`Failed to add ${type}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (item) => {
    try {
      const id = item._id || item.id;
      await updateTask(id, { completed: !item.completed });
      fetchAll();
    } catch (err) {
      toast.error('Failed to update');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const id = deleteTarget._id || deleteTarget.id;
      await deleteTask(id);
      toast.success('Deleted');
      setDeleteTarget(null);
      fetchAll();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const renderAddForm = (type) => (
    <div className="flex flex-col sm:flex-row gap-2 mt-3 p-3 bg-white/[0.03] rounded-xl border border-white/5">
      <input
        type="text"
        value={newItem.title}
        onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
        placeholder={type === 'task' ? 'What needs to be done?' : 'Remind me to...'}
        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
        onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(type); }}
      />
      <input
        type="datetime-local"
        value={newItem.dueDate}
        onChange={(e) => setNewItem({ ...newItem, dueDate: e.target.value })}
        className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
      />
      <button
        onClick={() => handleAdd(type)}
        disabled={submitting}
        className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white text-sm font-medium transition-all disabled:opacity-50 whitespace-nowrap"
      >
        {submitting ? 'Adding...' : 'Add'}
      </button>
    </div>
  );

  const renderList = (items, type) => (
    <div className="space-y-1">
      {items.length > 0 ? (
        items.map((item) => (
          <div
            key={item._id || item.id}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.02] transition-colors group ${
              item.completed ? 'opacity-50' : ''
            }`}
          >
            <button
              onClick={() => handleToggle(item)}
              className="flex-shrink-0 transition-colors"
            >
              {item.completed ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <Circle className="w-5 h-5 text-gray-600 hover:text-violet-400" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${item.completed ? 'line-through text-gray-500' : 'text-white'}`}>
                {item.title}
              </p>
              {item.dueDate && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(item.dueDate).toLocaleString('en-IN', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              )}
            </div>
            {!item.completed && getDueBadge(item.dueDate)}
            <button
              onClick={() => setDeleteTarget(item)}
              className="flex-shrink-0 p-1 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-gray-500">
          {type === 'task' ? (
            <ListTodo className="w-8 h-8 mb-2 text-gray-600" />
          ) : (
            <Bell className="w-8 h-8 mb-2 text-gray-600" />
          )}
          <p className="text-sm">No {type}s yet</p>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Tasks & Reminders</h1>
        <p className="text-gray-500 text-sm">Manage your to-dos and set reminders</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks */}
        <div className="bg-[#1a1f3a]/60 backdrop-blur-sm border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-violet-400" />
              <h2 className="text-lg font-semibold text-white">Tasks</h2>
              <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
                {tasks.filter((t) => !t.completed).length} active
              </span>
            </div>
            <button
              onClick={() => { setShowAddTask(!showAddTask); setShowAddReminder(false); setNewItem({ title: '', dueDate: '' }); }}
              className="flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
          {showAddTask && renderAddForm('task')}
          {renderList(tasks, 'task')}
        </div>

        {/* Reminders */}
        <div className="bg-[#1a1f3a]/60 backdrop-blur-sm border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Reminders</h2>
              <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
                {reminders.filter((r) => !r.completed).length} active
              </span>
            </div>
            <button
              onClick={() => { setShowAddReminder(!showAddReminder); setShowAddTask(false); setNewItem({ title: '', dueDate: '' }); }}
              className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
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
