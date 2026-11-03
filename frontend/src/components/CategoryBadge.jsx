const categoryColors = {
  food: { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/20' },
  transport: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/20' },
  entertainment: { bg: 'bg-pink-500/15', text: 'text-pink-400', border: 'border-pink-500/20' },
  shopping: { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/20' },
  health: { bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/20' },
  bills: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/20' },
  education: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  travel: { bg: 'bg-indigo-500/15', text: 'text-indigo-400', border: 'border-indigo-500/20' },
  groceries: { bg: 'bg-lime-500/15', text: 'text-lime-400', border: 'border-lime-500/20' },
  rent: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/20' },
  utilities: { bg: 'bg-teal-500/15', text: 'text-teal-400', border: 'border-teal-500/20' },
  salary: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  other: { bg: 'bg-gray-500/15', text: 'text-gray-400', border: 'border-gray-500/20' },
};

export function getCategoryColor(category) {
  const key = (category || 'other').toLowerCase();
  return categoryColors[key] || categoryColors.other;
}

export default function CategoryBadge({ category }) {
  const colors = getCategoryColor(category);

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border} capitalize`}
    >
      {category || 'Other'}
    </span>
  );
}
