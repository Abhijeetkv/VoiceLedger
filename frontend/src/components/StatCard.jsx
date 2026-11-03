export default function StatCard({ icon, label, value, subtext, trend, className = '' }) {
  return (
    <div
      className={`bg-[#1a1f3a]/60 backdrop-blur-sm border border-white/5 rounded-2xl p-5 flex flex-col gap-3 ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-violet-400">
          {icon}
        </div>
        {trend !== undefined && (
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              trend >= 0
                ? 'bg-green-500/10 text-green-400'
                : 'bg-red-500/10 text-red-400'
            }`}
          >
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
        {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
      </div>
    </div>
  );
}
