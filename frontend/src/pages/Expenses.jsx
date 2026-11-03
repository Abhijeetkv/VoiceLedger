import { useState, useEffect } from 'react';
import {
  Plus, Search, Trash2, Pencil, ChevronLeft, ChevronRight,
  Loader2, ReceiptText, Filter,
} from 'lucide-react';
import CategoryBadge from '../components/CategoryBadge.jsx';
import ExpenseForm from '../components/ExpenseForm.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { getExpenses, createExpense, updateExpense, deleteExpense } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';

const formatCurrency = (amt) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amt || 0);

const categories = [
  '', 'Food', 'Transport', 'Shopping', 'Bills', 'Health', 'Entertainment', 'Education', 'Other',
];

const PAGE_SIZE = 15;

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ category: '', startDate: '', endDate: '', search: '' });
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const toast = useToast();

  useEffect(() => {
    fetchExpenses();
  }, [page, filters.category, filters.startDate, filters.endDate]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params = {
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      };
      if (filters.category) params.category = filters.category;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const res = await getExpenses(params);
      const data = res.data;
      const list = data.data || data.expenses || (Array.isArray(data) ? data : []);
      setExpenses(list);
      setTotalCount(data.total ?? list.length);
    } catch (err) {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data) => {
    try {
      await createExpense(data);
      toast.success('Expense added!');
      fetchExpenses();
    } catch (err) {
      toast.error('Failed to add expense');
      throw err;
    }
  };

  const handleUpdate = async (data) => {
    try {
      const id = editingExpense._id || editingExpense.id;
      await updateExpense(id, data);
      toast.success('Expense updated!');
      setEditingExpense(null);
      fetchExpenses();
    } catch (err) {
      toast.error('Failed to update expense');
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const id = deleteTarget._id || deleteTarget.id;
      await deleteExpense(id);
      toast.success('Expense deleted');
      setDeleteTarget(null);
      fetchExpenses();
    } catch (err) {
      toast.error('Failed to delete expense');
    }
  };

  const filteredExpenses = filters.search
    ? expenses.filter((e) =>
        (e.note || '').toLowerCase().includes(filters.search.toLowerCase()) ||
        (e.category || '').toLowerCase().includes(filters.search.toLowerCase())
      )
    : expenses;

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Expenses</h1>
          <p className="text-gray-500 text-sm">Track and manage your spending</p>
        </div>
        <button
          onClick={() => { setEditingExpense(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-medium transition-all"
        >
          <Plus className="w-4 h-4" /> Add Expense
        </button>
      </div>

      {/* Filters */}
      <div className="bg-[#1a1f3a]/60 backdrop-blur-sm border border-white/5 rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
            />
          </div>
          <select
            value={filters.category}
            onChange={(e) => { setFilters({ ...filters, category: e.target.value }); setPage(0); }}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 capitalize"
          >
            <option value="" className="bg-[#1a1f3a]">All Categories</option>
            {categories.filter(Boolean).map((c) => (
              <option key={c} value={c} className="bg-[#1a1f3a] capitalize">{c}</option>
            ))}
          </select>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => { setFilters({ ...filters, startDate: e.target.value }); setPage(0); }}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
            placeholder="Start date"
          />
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => { setFilters({ ...filters, endDate: e.target.value }); setPage(0); }}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
            placeholder="End date"
          />
        </div>
      </div>

      {/* Expense List */}
      <div className="bg-[#1a1f3a]/60 backdrop-blur-sm border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
          </div>
        ) : filteredExpenses.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Date</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Note</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Category</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Amount</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((exp) => (
                    <tr
                      key={exp._id || exp.id}
                      className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-6 py-3 text-sm text-gray-400 whitespace-nowrap">
                        {new Date(exp.date).toLocaleDateString('en-IN', {
                          year: 'numeric', month: 'short', day: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-3 text-sm text-white">{exp.note || '—'}</td>
                      <td className="px-6 py-3"><CategoryBadge category={exp.category} /></td>
                      <td className="px-6 py-3 text-sm font-semibold text-white text-right">
                        {formatCurrency(exp.amount)}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => { setEditingExpense(exp); setShowForm(true); }}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-violet-400 hover:bg-violet-500/10 transition-all"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(exp)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile list */}
            <div className="sm:hidden divide-y divide-white/5">
              {filteredExpenses.map((exp) => (
                <div key={exp._id || exp.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{exp.note || '—'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <CategoryBadge category={exp.category} />
                      <span className="text-xs text-gray-500">
                        {new Date(exp.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white">{formatCurrency(exp.amount)}</p>
                    <button
                      onClick={() => { setEditingExpense(exp); setShowForm(true); }}
                      className="p-1.5 text-gray-500 hover:text-violet-400"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(exp)}
                      className="p-1.5 text-gray-500 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-3 border-t border-white/5">
              <p className="text-xs text-gray-500">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-400 px-2">
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <ReceiptText className="w-10 h-10 text-gray-600" />
            <p className="text-gray-500 text-sm">No expenses found</p>
            <button
              onClick={() => { setEditingExpense(null); setShowForm(true); }}
              className="text-sm text-violet-400 hover:text-violet-300"
            >
              Add your first expense
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showForm && (
        <ExpenseForm
          expense={editingExpense}
          onSubmit={editingExpense ? handleUpdate : handleCreate}
          onClose={() => { setShowForm(false); setEditingExpense(null); }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Expense"
          message={`Are you sure you want to delete "${deleteTarget.note || 'this expense'}"?`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
