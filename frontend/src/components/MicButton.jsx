import { Mic, MicOff, Loader2 } from 'lucide-react';
import WaveformAnimation from './WaveformAnimation.jsx';

export default function MicButton({ state = 'idle', onClick, size = 'lg' }) {
  const sizeClasses = size === 'lg' ? 'w-28 h-28 sm:w-32 sm:h-32' : 'w-14 h-14';
  const iconSize = size === 'lg' ? 'w-10 h-10 sm:w-12 sm:h-12' : 'w-6 h-6';

  const stateConfig = {
    idle: {
      bg: 'bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-xl shadow-violet-500/30',
      icon: <Mic className={`${iconSize} text-white`} />,
      label: 'Tap to speak',
    },
    listening: {
      bg: 'bg-gradient-to-br from-rose-600 to-red-500 shadow-xl shadow-red-500/30',
      icon: <Mic className={`${iconSize} text-white animate-pulse`} />,
      label: 'Listening...',
    },
    thinking: {
      bg: 'bg-gradient-to-br from-blue-600 to-indigo-600 shadow-xl shadow-blue-500/30',
      icon: <Loader2 className={`${iconSize} text-white animate-spin`} />,
      label: 'Processing...',
    },
    speaking: {
      bg: 'bg-gradient-to-br from-emerald-600 to-teal-500 shadow-xl shadow-emerald-500/30',
      icon: null,
      label: 'Speaking reply...',
    },
    error: {
      bg: 'bg-gradient-to-br from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-xl shadow-red-500/30',
      icon: <MicOff className={`${iconSize} text-white`} />,
      label: 'Tap to retry',
    },
  };

  const config = stateConfig[state] || stateConfig.idle;
  const isClickable = state === 'idle' || state === 'listening' || state === 'error';

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex items-center justify-center">
        {/* Animated rings for listening */}
        {state === 'listening' && (
          <>
            <div className={`absolute ${sizeClasses} rounded-full bg-red-500/25 animate-pulse-ring`} />
            <div
              className={`absolute ${sizeClasses} rounded-full bg-red-500/15 animate-pulse-ring`}
              style={{ animationDelay: '0.3s' }}
            />
            <div
              className={`absolute ${sizeClasses} rounded-full bg-red-500/10 animate-pulse-ring`}
              style={{ animationDelay: '0.6s' }}
            />
          </>
        )}

        {/* Idle pulse */}
        {state === 'idle' && (
          <div className={`absolute ${sizeClasses} rounded-full bg-violet-500/15 animate-pulse`} />
        )}

        <button
          onClick={isClickable ? onClick : undefined}
          disabled={!isClickable}
          className={`relative ${sizeClasses} rounded-full ${config.bg} flex items-center justify-center transition-all duration-300 ${
            isClickable ? 'cursor-pointer active:scale-95 hover:scale-105' : 'cursor-default'
          }`}
          aria-label={config.label}
        >
          {state === 'speaking' ? (
            <WaveformAnimation variant="speaking" />
          ) : (
            config.icon
          )}
        </button>
      </div>

      <p className="text-sm font-semibold text-slate-600 mt-1">{config.label}</p>
    </div>
  );
}
