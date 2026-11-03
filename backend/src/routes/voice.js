import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { voiceCommandSchema } from '../utils/validation.js';
import { processVoiceCommand } from '../services/ai.js';
import { executeActions } from '../services/actions.js';
import { getSummary } from '../services/summary.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();
router.use(optionalAuth);

/**
 * POST /api/voice-command
 * Process a voice command through AI, execute actions, and save history.
 */
router.post('/', async (req, res, next) => {
  try {
    // 1. Validate request body
    const { transcript, timezone, currentDateISO, language, userEmail, conversationHistory } = voiceCommandSchema.parse(req.body);

    const dateISO = currentDateISO || new Date().toISOString();
    const resolvedEmail = userEmail || req.user?.email;

    // 2. Call AI to process the transcript with conversational history
    const aiResult = await processVoiceCommand({
      transcript,
      timezone,
      currentDateISO: dateISO,
      language,
      conversationHistory,
    });

    let { actions = [], spokenReply = '' } = aiResult;
    let results = [];

    // 3. Execute actions if present
    if (actions.length > 0) {
      results = await executeActions(actions, { userEmail: resolvedEmail, userId: req.user?.id });
    }

    // 4. If QUERY_SUMMARY was requested, build a spoken reply from the actual data
    const summaryResult = results.find((r) => r.type === 'QUERY_SUMMARY' && r.success);
    if (summaryResult) {
      const summary = summaryResult.data;
      const formattedTotal = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(summary.totalAmount);

      if (summary.count === 0) {
        spokenReply = `No expenses found for ${summary.period}.`;
      } else {
        const highestCategory = summary.byCategory.sort((a, b) => b.total - a.total)[0];
        spokenReply = `You spent ${formattedTotal} ${summary.period === 'today' ? 'today' : `this ${summary.period}`} across ${summary.count} transaction${summary.count !== 1 ? 's' : ''}. Highest category: ${highestCategory?.category || 'Other'} (₹${Math.round(highestCategory?.total || 0)}).`;
      }
    }

    // Ensure spokenReply is never empty so the voice assistant never remains mute
    if (!spokenReply || !spokenReply.trim()) {
      spokenReply = actions.length > 0
        ? 'Action completed.'
        : "I'm here! Tell me an expense to log or a reminder to set.";
    }

    // 5. Save to CommandHistory
    const command = await prisma.commandHistory.create({
      data: {
        userId: req.user?.id || null,
        transcript,
        spokenReply,
        actions,
        results,
      },
    });

    // 6. Return response
    res.json({
      success: true,
      actions,
      results,
      spokenReply,
      commandId: command.id,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

