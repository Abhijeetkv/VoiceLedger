import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { createExpenseSchema, updateExpenseSchema, EXPENSE_CATEGORIES } from '../utils/validation.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();
router.use(optionalAuth);

/**
 * GET /api/expenses
 * List expenses with optional filters.
 */
router.get('/', async (req, res, next) => {
  try {
    const { category, startDate, endDate, limit, offset } = req.query;

    const where = {};

    if (req.user?.id) {
      where.OR = [{ userId: req.user.id }, { userId: null }];
    }

    if (category) {
      if (!EXPENSE_CATEGORIES.includes(category)) {
        return res.status(400).json({ success: false, error: `Invalid category. Must be one of: ${EXPENSE_CATEGORIES.join(', ')}` });
      }
      where.category = category;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
      take: limit ? parseInt(limit, 10) : undefined,
      skip: offset ? parseInt(offset, 10) : undefined,
    });

    const total = await prisma.expense.count({ where });

    res.json({ success: true, data: expenses, total });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/expenses
 * Create a new expense.
 */
router.post('/', async (req, res, next) => {
  try {
    const data = createExpenseSchema.parse(req.body);

    const expense = await prisma.expense.create({
      data: {
        userId: req.user?.id || null,
        amount: data.amount,
        currency: data.currency,
        category: data.category,
        note: data.note,
        date: data.date ? new Date(data.date) : new Date(),
      },
    });

    res.status(201).json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/expenses/:id
 * Update an expense.
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = updateExpenseSchema.parse(req.body);

    const updateData = { ...data };
    if (data.date) updateData.date = new Date(data.date);

    const expense = await prisma.expense.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/expenses/:id
 * Delete an expense.
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const expense = await prisma.expense.delete({ where: { id } });

    res.json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
});

export default router;

