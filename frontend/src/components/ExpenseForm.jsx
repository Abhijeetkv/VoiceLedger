import { useState } from 'react';
import { X } from 'lucide-react';

const categories = [
  'Food', 'Transport', 'Shopping', 'Bills', 'Health', 'Entertainment', 'Education', 'Other',
];

export default function ExpenseForm({ expense, onSubmit, onClose }) {
  const [form, setForm] = useState({
    amount: expense?.amount || '',
    category: expense?.category || 'Food',
    note: expense?.note || '',
    date: expense?.date ? new Date(expense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    currency: expense?.currency || 'INR',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const errs = {};
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) {
      errs.amount = 'Enter a valid amount';
    }
    if (!form.note.trim()) {
      errs.note = 'Note is required';
    }
    if (!form.date) {
      errs.date = 'Date is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        ...form,
        amount: Number(form.amount),
      });
      onClose();
    } catch {
      // handled by parent
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1f3a] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="text-lg font-semibold text-white">
            {expense ? 'Edit Expense' : 'Add Expense'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
              placeholder="250.00"
            />
            {errors.amount && <p className="text-red-400 text-xs mt-1">{errors.amount}</p>}
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 transition-colors capitalize"
            >
              {categories.map((c) => (
                <option key={c} value={c} className="bg-[#1a1f3a] capitalize">
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Note</label>
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
              placeholder="Lunch at cafe"
            />
            {errors.note && <p className="text-red-400 text-xs mt-1">{errors.note}</p>}
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 transition-colors"
            />
            {errors.date && <p className="text-red-400 text-xs mt-1">{errors.date}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-medium transition-all disabled:opacity-50"
            >
              {submitting ? 'Saving...' : expense ? 'Update' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
