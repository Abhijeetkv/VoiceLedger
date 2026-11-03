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
          <h1 className="text-2xl font-bold text-slate-900">Expenses</h1>
          <p className="text-slate-500 text-sm">Track and manage your spending</p>
        </div>
        <button
          onClick={() => { setEditingExpense(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium transition-all shadow-xs"
        >
          <Plus className="w-4 h-4" /> Add Expense
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full bg-slate-50/70 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-600 focus:bg-white transition-all"
            />
          </div>
          <select
            value={filters.category}
            onChange={(e) => { setFilters({ ...filters, category: e.target.value }); setPage(0); }}
            className="bg-slate-50/70 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-violet-600 focus:bg-white capitalize transition-all"
          >
            <option value="" className="bg-white text-slate-900">All Categories</option>
            {categories.filter(Boolean).map((c) => (
              <option key={c} value={c} className="bg-white text-slate-900 capitalize">{c}</option>
            ))}
          </select>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => { setFilters({ ...filters, startDate: e.target.value }); setPage(0); }}
            className="bg-slate-50/70 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-violet-600 focus:bg-white transition-all"
            placeholder="Start date"
          />
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => { setFilters({ ...filters, endDate: e.target.value }); setPage(0); }}
            className="bg-slate-50/70 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-violet-600 focus:bg-white transition-all"
            placeholder="End date"
          />
        </div>
      </div>

      {/* Expense List */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 text-violet-600 animate-spin" />
          </div>
        ) : filteredExpenses.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3.5">Date</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3.5">Note</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3.5">Category</th>
                    <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3.5">Amount</th>
                    <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3.5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExpenses.map((exp) => (
                    <tr
                      key={exp._id || exp.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="px-6 py-3.5 text-sm text-slate-500 whitespace-nowrap">
                        {new Date(exp.date).toLocaleDateString('en-IN', {
                          year: 'numeric', month: 'short', day: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-3.5 text-sm text-slate-900 font-medium">{exp.note || '—'}</td>
                      <td className="px-6 py-3.5"><CategoryBadge category={exp.category} /></td>
                      <td className="px-6 py-3.5 text-sm font-bold text-slate-900 text-right">
                        {formatCurrency(exp.amount)}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => { setEditingExpense(exp); setShowForm(true); }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-all"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(exp)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                            title="Delete"
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
            <div className="sm:hidden divide-y divide-slate-100">
              {filteredExpenses.map((exp) => (
                <div key={exp._id || exp.id} className="px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/60">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{exp.note || '—'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <CategoryBadge category={exp.category} />
                      <span className="text-xs text-slate-500">
                        {new Date(exp.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900">{formatCurrency(exp.amount)}</p>
                    <button
                      onClick={() => { setEditingExpense(exp); setShowForm(true); }}
                      className="p-1.5 text-slate-400 hover:text-violet-600"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(exp)}
                      className="p-1.5 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 bg-slate-50/50">
              <p className="text-xs text-slate-500 font-medium">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold text-slate-700 px-2">
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <ReceiptText className="w-10 h-10 text-slate-300" />
            <p className="text-slate-500 text-sm font-medium">No expenses found</p>
            <button
              onClick={() => { setEditingExpense(null); setShowForm(true); }}
              className="text-sm font-semibold text-violet-600 hover:text-violet-700"
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
