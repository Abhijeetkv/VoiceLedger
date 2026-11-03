import prisma from '../lib/prisma.js';

export async function getSummary(period = 'today', category = null) {
  const now = new Date();
  let startDate;

  switch (period) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'all':
    default:
      startDate = new Date(0);
  }

  const where = { date: { gte: startDate } };
  if (category) where.category = category;

  const expenses = await prisma.expense.findMany({ where, orderBy: { date: 'desc' } });

  const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  // Group by category
  const byCategory = {};
  expenses.forEach((e) => {
    if (!byCategory[e.category]) {
      byCategory[e.category] = { category: e.category, total: 0, count: 0 };
    }
    byCategory[e.category].total += Number(e.amount);
    byCategory[e.category].count += 1;
  });

  return {
    period,
    totalAmount,
    count: expenses.length,
    byCategory: Object.values(byCategory),
    recentExpenses: expenses.slice(0, 5),
  };
}

