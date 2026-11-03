import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { createTaskSchema, updateTaskSchema } from '../utils/validation.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();
router.use(optionalAuth);

/**
 * GET /api/tasks
 * List tasks with optional filters.
 */
router.get('/', async (req, res, next) => {
  try {
    const { type, completed } = req.query;

    const where = {};

    if (req.user?.id) {
      where.OR = [{ userId: req.user.id }, { userId: null }];
    }

    if (type) {
      const normalizedType = type.toUpperCase();
      if (!['TASK', 'REMINDER'].includes(normalizedType)) {
        return res.status(400).json({ success: false, error: 'Invalid type. Must be TASK or REMINDER.' });
      }
      where.type = normalizedType;
    }

    if (completed !== undefined) {
      where.completed = completed === 'true';
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: tasks });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tasks
 * Create a new task.
 */
router.post('/', async (req, res, next) => {
  try {
    const data = createTaskSchema.parse(req.body);

    const task = await prisma.task.create({
      data: {
        userId: req.user?.id || null,
        title: data.title,
        type: data.type,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        completed: data.completed,
      },
    });

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/tasks/:id
 * Update a task.
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = updateTaskSchema.parse(req.body);

    const updateData = { ...data };
    if (data.dueDate) updateData.dueDate = new Date(data.dueDate);

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tasks/:id
 * Delete a task.
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const task = await prisma.task.delete({ where: { id } });

    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
});

export default router;

// --- Reminders sub-routes (mounted separately in index.js) ---
export const remindersRouter = Router();

/**
 * GET /api/reminders/due
 * Get reminders where dueDate <= now AND notified=false AND completed=false.
 */
remindersRouter.get('/due', async (req, res, next) => {
  try {
    const reminders = await prisma.task.findMany({
      where: {
        type: 'REMINDER',
        completed: false,
        notified: false,
        dueDate: {
          lte: new Date(),
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    // Mark as notified in database to prevent duplicate alerts
    if (reminders.length > 0) {
      await prisma.task.updateMany({
        where: {
          id: { in: reminders.map((r) => r.id) },
        },
        data: { notified: true },
      });
    }

    res.json({ success: true, data: reminders });
  } catch (error) {
    next(error);
  }
});

