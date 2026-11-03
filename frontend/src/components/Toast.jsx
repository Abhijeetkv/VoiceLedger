import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

const variants = {
  success: {
    bg: 'bg-green-900/80 border-green-500/30',
    icon: <CheckCircle className="w-5 h-5 text-green-400" />,
  },
  error: {
    bg: 'bg-red-900/80 border-red-500/30',
    icon: <XCircle className="w-5 h-5 text-red-400" />,
  },
  info: {
    bg: 'bg-blue-900/80 border-blue-500/30',
    icon: <Info className="w-5 h-5 text-blue-400" />,
  },
  warning: {
    bg: 'bg-yellow-900/80 border-yellow-500/30',
    icon: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
  },
};

export default function Toast({ message, variant = 'info', onDismiss }) {
  const v = variants[variant] || variants.info;

  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm shadow-lg animate-slide-in ${v.bg}`}
      style={{ animation: 'slideIn 0.3s ease-out' }}
    >
      {v.icon}
      <p className="text-sm text-white flex-1">{message}</p>
      <button
        onClick={onDismiss}
        className="text-gray-400 hover:text-white transition-colors"
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
