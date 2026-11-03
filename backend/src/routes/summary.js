import { Router } from 'express';
import { getSummary } from '../services/summary.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();
router.use(optionalAuth);

/**
 * GET /api/summary
 * Get spending summaries. Supports query param: period (today, week, month, all).
 */
router.get('/', async (req, res, next) => {
  try {
    const { period, category } = req.query;

    const validPeriods = ['today', 'week', 'month', 'all'];
    const selectedPeriod = validPeriods.includes(period) ? period : 'today';

    const summary = await getSummary(selectedPeriod, category || null, req.user?.id);

    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
});

export default router;

