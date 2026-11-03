import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({ title, message, confirmLabel = 'Confirm', onConfirm, onCancel, variant = 'danger' }) {
  const btnClass =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-500'
      : 'bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1f3a] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-red-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-400 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 rounded-xl text-white font-medium transition-all ${btnClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
