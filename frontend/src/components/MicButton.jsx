import { Mic, MicOff, Loader2 } from 'lucide-react';
import WaveformAnimation from './WaveformAnimation.jsx';

export default function MicButton({ state = 'idle', onClick, size = 'lg' }) {
  const sizeClasses = size === 'lg' ? 'w-28 h-28 sm:w-32 sm:h-32' : 'w-14 h-14';
  const iconSize = size === 'lg' ? 'w-10 h-10 sm:w-12 sm:h-12' : 'w-6 h-6';

  const stateConfig = {
    idle: {
      bg: 'bg-gradient-to-br from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500',
      ring: '',
      icon: <Mic className={`${iconSize} text-white`} />,
      label: 'Tap to speak',
    },
    listening: {
      bg: 'bg-gradient-to-br from-red-600 to-red-500',
      ring: 'ring-listening',
      icon: <Mic className={`${iconSize} text-white animate-pulse`} />,
      label: 'Listening...',
    },
    thinking: {
      bg: 'bg-gradient-to-br from-blue-600 to-cyan-500',
      ring: '',
      icon: <Loader2 className={`${iconSize} text-white animate-spin`} />,
      label: 'Processing...',
    },
    speaking: {
      bg: 'bg-gradient-to-br from-green-600 to-emerald-500',
      ring: '',
      icon: null,
      label: 'Speaking...',
    },
    error: {
      bg: 'bg-gradient-to-br from-red-700 to-red-600 hover:from-red-600 hover:to-red-500',
      ring: '',
      icon: <MicOff className={`${iconSize} text-white`} />,
      label: 'Tap to retry',
    },
  };

  const config = stateConfig[state] || stateConfig.idle;
  const isClickable = state === 'idle' || state === 'listening' || state === 'error';

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex items-center justify-center">
        {/* Animated rings for listening */}
        {state === 'listening' && (
          <>
            <div className={`absolute ${sizeClasses} rounded-full bg-red-500/20 animate-pulse-ring`} />
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
          <div className={`absolute ${sizeClasses} rounded-full bg-violet-500/10 animate-pulse`} />
        )}

        <button
          onClick={isClickable ? onClick : undefined}
          disabled={!isClickable}
          className={`relative ${sizeClasses} rounded-full ${config.bg} flex items-center justify-center shadow-2xl transition-all duration-300 ${
            isClickable ? 'cursor-pointer active:scale-95' : 'cursor-default'
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

      <p className="text-sm text-gray-400 font-medium">{config.label}</p>
    </div>
  );
}
