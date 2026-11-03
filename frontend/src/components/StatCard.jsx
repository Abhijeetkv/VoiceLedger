export default function StatCard({ icon, label, value, subtext, trend, className = '' }) {
  return (
    <div
      className={`bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 flex flex-col gap-3.5 shadow-xs hover:shadow-md transition-all duration-200 ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="w-11 h-11 rounded-xl bg-violet-50 border border-violet-100/60 flex items-center justify-center text-violet-600 shadow-2xs">
          {icon}
        </div>
        {trend !== undefined && (
          <span
            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
              trend >= 0
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                : 'bg-rose-50 text-rose-700 border border-rose-200/60'
            }`}
          >
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{value}</p>
        {subtext && <p className="text-xs text-slate-400 font-medium mt-1">{subtext}</p>}
      </div>
    </div>
  );
}
