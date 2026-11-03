const categoryColors = {
  food: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  transport: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  entertainment: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
  shopping: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  health: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  bills: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  education: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  travel: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  groceries: { bg: 'bg-lime-50', text: 'text-lime-700', border: 'border-lime-200' },
  rent: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  utilities: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  salary: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  other: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
};

export function getCategoryColor(category) {
  const key = (category || 'other').toLowerCase();
  return categoryColors[key] || categoryColors.other;
}

export default function CategoryBadge({ category }) {
  const colors = getCategoryColor(category);

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${colors.bg} ${colors.text} ${colors.border} capitalize shadow-2xs`}
    >
      {category || 'Other'}
    </span>
  );
}
