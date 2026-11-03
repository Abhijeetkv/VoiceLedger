import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

const variants = {
  success: {
    border: 'border-emerald-200',
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
    badge: 'bg-emerald-50',
  },
  error: {
    border: 'border-rose-200',
    icon: <XCircle className="w-5 h-5 text-rose-600 shrink-0" />,
    badge: 'bg-rose-50',
  },
  info: {
    border: 'border-blue-200',
    icon: <Info className="w-5 h-5 text-blue-600 shrink-0" />,
    badge: 'bg-blue-50',
  },
  warning: {
    border: 'border-amber-200',
    icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
    badge: 'bg-amber-50',
  },
};

export default function Toast({ message, variant = 'info', onDismiss }) {
  const v = variants[variant] || variants.info;

  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border ${v.border} shadow-xl shadow-slate-200/50 transition-all`}
      style={{ animation: 'slideIn 0.25s ease-out' }}
    >
      <div className={`p-1 rounded-lg ${v.badge}`}>
        {v.icon}
      </div>
      <p className="text-xs sm:text-sm font-semibold text-slate-800 flex-1">{message}</p>
      <button
        onClick={onDismiss}
        className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
