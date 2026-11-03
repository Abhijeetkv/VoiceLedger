import prisma from '../lib/prisma.js';
import { sendEmail } from './email.js';
import { getSummary } from './summary.js';

export async function executeActions(actions, context = {}) {
  const results = [];
  for (const action of actions) {
    try {
      const result = await executeAction(action, context);
      results.push({ type: action.type, success: true, data: result });
    } catch (error) {
      results.push({ type: action.type, success: false, error: error.message });
    }
  }
  return results;
}

async function executeAction(action, context = {}) {
  switch (action.type) {
    case 'ADD_EXPENSE':
      return prisma.expense.create({
        data: {
          userId: context.userId || null,
          amount: action.amount,
          currency: action.currency || 'INR',
          category: action.category || 'Other',
          note: action.note || '',
          date: new Date(action.date || new Date()),
        },
      });
    case 'ADD_REMINDER':
      return prisma.task.create({
        data: {
          userId: context.userId || null,
          title: action.title,
          type: 'REMINDER',
          dueDate: action.dueDate ? new Date(action.dueDate) : null,
        },
      });
    case 'ADD_TASK':
      return prisma.task.create({
        data: {
          userId: context.userId || null,
          title: action.title,
          type: 'TASK',
          dueDate: action.dueDate ? new Date(action.dueDate) : null,
        },
      });
    case 'SEND_EMAIL':
      return sendEmail({ ...action, userEmail: context.userEmail });
    case 'QUERY_SUMMARY':
      return getSummary(action.period, action.category);
    case 'DELETE_LAST':
      return deleteLastExpense();
    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}

async function deleteLastExpense() {
  const last = await prisma.expense.findFirst({ orderBy: { createdAt: 'desc' } });
  if (!last) throw new Error('No expenses to delete');
  return prisma.expense.delete({ where: { id: last.id } });
}

