export default function WaveformAnimation({ variant = 'listening', className = '' }) {
  const barCount = 7;
  const colors = {
    listening: 'bg-red-400',
    speaking: 'bg-green-400',
    idle: 'bg-violet-400',
  };

  const barColor = colors[variant] || colors.idle;

  return (
    <div className={`flex items-center justify-center gap-1 h-8 ${className}`}>
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          className={`w-1 rounded-full wave-bar ${barColor}`}
          style={{
            animationDelay: `${i * 0.12}s`,
            height: '8px',
          }}
        />
      ))}
    </div>
  );
}
