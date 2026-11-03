import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({ isOpen = true, title, message, confirmLabel = 'Confirm', onConfirm, onCancel, variant = 'danger' }) {
  if (!isOpen) return null;

  const btnClass =
    variant === 'danger'
      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/30'
      : 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm shadow-violet-600/30';

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm shadow-2xl p-6 text-center animate-fade-in">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto mb-4 text-rose-600">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 mb-6 font-medium">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-sm transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${btnClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
