import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { resetConfirmSchema } from '../utils/validation.js';

const router = Router();

/**
 * POST /api/demo/seed
 * Run the seed function. Prevents duplicate seeding.
 */
router.post('/seed', async (req, res, next) => {
  try {
    const existingExpenses = await prisma.expense.count();
    const existingTasks = await prisma.task.count();

    if (existingExpenses > 0 || existingTasks > 0) {
      return res.json({
        success: true,
        message: 'Database already has data. Skipping seed.',
        counts: { expenses: existingExpenses, tasks: existingTasks },
      });
    }

    const now = new Date();

    function daysAgo(days) {
      const d = new Date(now);
      d.setDate(d.getDate() - days);
      d.setHours(Math.floor(Math.random() * 12) + 8, Math.floor(Math.random() * 60), 0, 0);
      return d;
    }

    function daysFromNow(days) {
      const d = new Date(now);
      d.setDate(d.getDate() + days);
      d.setHours(10, 0, 0, 0);
      return d;
    }

    const expenses = [
      { amount: 120, category: 'Food', note: 'Lunch at canteen', date: daysAgo(0) },
      { amount: 60, category: 'Food', note: 'Tea and samosa', date: daysAgo(1) },
      { amount: 350, category: 'Food', note: 'Dinner with friends at Dominos', date: daysAgo(3) },
      { amount: 80, category: 'Food', note: 'Breakfast - idli dosa', date: daysAgo(5) },
      { amount: 45, category: 'Food', note: 'Coffee at CCD', date: daysAgo(8) },
      { amount: 150, category: 'Transport', note: 'Auto to college', date: daysAgo(1) },
      { amount: 250, category: 'Transport', note: 'Uber to railway station', date: daysAgo(7) },
      { amount: 100, category: 'Transport', note: 'Bus pass recharge', date: daysAgo(15) },
      { amount: 450, category: 'Shopping', note: 'Notebook and pens', date: daysAgo(2) },
      { amount: 1200, category: 'Shopping', note: 'New headphones', date: daysAgo(10) },
      { amount: 799, category: 'Shopping', note: 'T-shirt from Myntra', date: daysAgo(18) },
      { amount: 499, category: 'Bills', note: 'Mobile recharge', date: daysAgo(4) },
      { amount: 1500, category: 'Bills', note: 'Electricity bill share', date: daysAgo(12) },
      { amount: 200, category: 'Health', note: 'Medicines from pharmacy', date: daysAgo(6) },
      { amount: 350, category: 'Entertainment', note: 'Movie ticket - Pushpa 3', date: daysAgo(9) },
      { amount: 199, category: 'Entertainment', note: 'Netflix subscription', date: daysAgo(20) },
      { amount: 1800, category: 'Education', note: 'Reference book - Data Structures', date: daysAgo(14) },
      { amount: 500, category: 'Education', note: 'Udemy course on sale', date: daysAgo(22) },
    ];

    for (const e of expenses) {
      await prisma.expense.create({
        data: {
          amount: e.amount,
          currency: 'INR',
          category: e.category,
          note: e.note,
          date: e.date,
        },
      });
    }

    const tasks = [
      { title: 'Complete DSA assignment', type: 'TASK', dueDate: daysFromNow(2), completed: false },
      { title: 'Submit lab report', type: 'TASK', dueDate: daysAgo(1), completed: true },
      { title: 'Buy groceries for the week', type: 'TASK', dueDate: daysFromNow(1), completed: false },
      { title: 'Fix portfolio website bug', type: 'TASK', dueDate: null, completed: false },
      { title: 'Read chapter 5 of DBMS book', type: 'TASK', dueDate: daysAgo(3), completed: false },
      { title: 'Call mom', type: 'REMINDER', dueDate: daysFromNow(0), completed: false },
      { title: 'Pay hostel fees', type: 'REMINDER', dueDate: daysFromNow(5), completed: false },
      { title: 'Submit scholarship form', type: 'REMINDER', dueDate: daysAgo(2), completed: false },
      { title: 'Dentist appointment', type: 'REMINDER', dueDate: daysFromNow(3), completed: false },
      { title: 'Return library book', type: 'REMINDER', dueDate: daysAgo(1), completed: true },
    ];

    for (const t of tasks) {
      await prisma.task.create({
        data: {
          title: t.title,
          type: t.type,
          dueDate: t.dueDate,
          completed: t.completed,
        },
      });
    }

    res.json({
      success: true,
      message: 'Database seeded successfully',
      counts: { expenses: expenses.length, tasks: tasks.length },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/demo/reset
 * Delete ALL data from all tables. Requires { "confirm": "RESET" } in body.
 */
router.delete('/reset', async (req, res, next) => {
  try {
    resetConfirmSchema.parse(req.body);

    const [expenses, tasks, commands] = await prisma.$transaction([
      prisma.expense.deleteMany(),
      prisma.task.deleteMany(),
      prisma.commandHistory.deleteMany(),
    ]);

    res.json({
      success: true,
      message: 'All data deleted',
      deleted: {
        expenses: expenses.count,
        tasks: tasks.count,
        commands: commands.count,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

