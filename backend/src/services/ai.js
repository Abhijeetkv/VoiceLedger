import { GoogleGenAI } from '@google/genai';
import { aiResponseSchema } from '../utils/validation.js';

const SYSTEM_PROMPT = `You are VoiceLedger AI assistant. You process voice commands about expenses, tasks, reminders, and emails.

Current date: {currentDate}
Timezone: {timezone}
Default currency: INR

ALLOWED ACTIONS:
1. ADD_EXPENSE: { "type": "ADD_EXPENSE", "amount": number, "currency": "INR", "category": "Food|Transport|Shopping|Bills|Health|Entertainment|Education|Other", "note": "description", "date": "ISO_DATE" }
2. ADD_REMINDER: { "type": "ADD_REMINDER", "title": "reminder text", "dueDate": "ISO_DATE" }
3. ADD_TASK: { "type": "ADD_TASK", "title": "task text", "dueDate": null_or_ISO_DATE }
4. SEND_EMAIL: { "type": "SEND_EMAIL", "to": "email", "subject": "subject", "body": "content" }
5. QUERY_SUMMARY: { "type": "QUERY_SUMMARY", "period": "today|week|month|all", "category": null_or_category }
6. DELETE_LAST: { "type": "DELETE_LAST" }

EXPENSE CATEGORIES: Food, Transport, Shopping, Bills, Health, Entertainment, Education, Other

RULES:
- Extract ALL actions from the user's command
- If the user mentions multiple expenses in a single sentence (e.g. "350 on Swiggy and 250 on Zomato"), extract a separate ADD_EXPENSE action for EACH expense
- Popular food delivery and dining brands like Swiggy, Zomato, Blinkit, Zepto, McDonald's, Domino's MUST be categorized as "Food"
- Resolve relative dates (tomorrow, Friday, next week) to ISO dates using the current date
- Default currency is INR
- For ambiguous input, return empty actions array and ask a clarification question in spokenReply
- Respond in the SAME LANGUAGE as the user's input
- For Hindi input, respond in Hindi

EXAMPLES:
User: "I spent 250 rupees on lunch"
Response: { "actions": [{ "type": "ADD_EXPENSE", "amount": 250, "currency": "INR", "category": "Food", "note": "Lunch", "date": "{todayISO}" }], "spokenReply": "Done! Your ₹250 lunch expense has been saved." }

User: "I spent 350 on Swiggy and 250 on Zomato"
Response: { "actions": [{ "type": "ADD_EXPENSE", "amount": 350, "currency": "INR", "category": "Food", "note": "Swiggy", "date": "{todayISO}" }, { "type": "ADD_EXPENSE", "amount": 250, "currency": "INR", "category": "Food", "note": "Zomato", "date": "{todayISO}" }], "spokenReply": "Done! Added ₹350 for Swiggy and ₹250 for Zomato to your expenses." }

User: "Remind me to submit my assignment tomorrow"
Response: { "actions": [{ "type": "ADD_REMINDER", "title": "Submit assignment", "dueDate": "{tomorrowISO}" }], "spokenReply": "Reminder set! I'll remind you to submit your assignment tomorrow." }

User: "I spent 250 rupees on lunch and remind me to submit my college form on Friday"
Response: { "actions": [{ "type": "ADD_EXPENSE", "amount": 250, "currency": "INR", "category": "Food", "note": "Lunch", "date": "{todayISO}" }, { "type": "ADD_REMINDER", "title": "Submit college form", "dueDate": "{fridayISO}" }], "spokenReply": "Done! Your ₹250 lunch expense has been saved, and your college form reminder is set for Friday." }

User: "How much did I spend today?"
Response: { "actions": [{ "type": "QUERY_SUMMARY", "period": "today", "category": null }], "spokenReply": "" }

You MUST respond with valid JSON only. No markdown, no code blocks, just the JSON object with "actions" array and "spokenReply" string.`;

/**
 * Build the system prompt with actual date values.
 */
function buildSystemPrompt(currentDateISO, timezone) {
  const now = new Date(currentDateISO || new Date().toISOString());
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Find next Friday
  const friday = new Date(now);
  const dayOfWeek = friday.getDay();
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
  friday.setDate(friday.getDate() + daysUntilFriday);

  return SYSTEM_PROMPT
    .replace(/{currentDate}/g, now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))
    .replace(/{timezone}/g, timezone || 'Asia/Kolkata')
    .replace(/{todayISO}/g, now.toISOString())
    .replace(/{tomorrowISO}/g, tomorrow.toISOString())
    .replace(/{fridayISO}/g, friday.toISOString());
}

/**
 * Parse JSON from AI response text, stripping markdown fences if present.
 */
function parseJsonResponse(text) {
  let cleaned = text.trim();
  // Strip markdown code fences if present
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Try to extract outermost { ... }
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const extracted = cleaned.substring(firstBrace, lastBrace + 1);
      return JSON.parse(extracted);
    }
    throw e;
  }
}

function categorizeExpenseNote(note) {
  const n = (note || '').toLowerCase();
  if (/swiggy|swigy|zomato|blinkit|zepto|instamart|food|lunch|dinner|breakfast|canteen|coffee|tea|chai|cafe|burger|pizza|dosa|samosa|restaurant|khana|grocer|subzi|fruits|milk|mcdonald|domino|kfc|snack|momo|biryani|paneer|roti/i.test(n)) {
    return 'Food';
  }
  if (/uber|ola|rapido|cab|auto|taxi|metro|bus|train|flight|petrol|diesel|fuel|transport|travel|toll|parking/i.test(n)) {
    return 'Transport';
  }
  if (/amazon|flipkart|myntra|ajio|meesho|shopping|clothes|shirt|pant|shoes|dress|mall|zara|h&m|earphones|headphones/i.test(n)) {
    return 'Shopping';
  }
  if (/bill|electricity|water|wifi|broadband|recharge|mobile|jio|airtel|rent|maintenance|gas/i.test(n)) {
    return 'Bills';
  }
  if (/doctor|medicine|pharmacy|hospital|clinic|test|gym|health|fitness/i.test(n)) {
    return 'Health';
  }
  if (/movie|cinema|netflix|prime|hotstar|spotify|game|party|club|entertainment/i.test(n)) {
    return 'Entertainment';
  }
  if (/book|course|college|school|tuition|pen|exam|fee|education|udemy|coursera|assignment/i.test(n)) {
    return 'Education';
  }
  return 'Other';
}

/**
 * Fallback natural language rule-based parser.
 * Used when Gemini API is unavailable or rate-limited.
 */
function fallbackParseVoiceCommand(transcript, currentDateISO) {
  const actions = [];
  const lower = transcript.toLowerCase();
  const now = new Date(currentDateISO || new Date());

  // 1. Spending query
  if (lower.includes('how much') || lower.includes('show my') || lower.includes('what was my') || lower.includes('summary')) {
    let period = 'today';
    if (lower.includes('week')) period = 'week';
    if (lower.includes('month')) period = 'month';
    if (lower.includes('all') || lower.includes('total')) period = 'all';
    actions.push({ type: 'QUERY_SUMMARY', period, category: null });
    return { actions, spokenReply: '' };
  }

  // 2. Email command
  if (lower.includes('email') || lower.includes('send summary')) {
    actions.push({
      type: 'SEND_EMAIL',
      subject: 'Weekly Spending Summary',
      body: 'Your weekly spending summary from VoiceLedger',
    });
    return { actions, spokenReply: 'I am emailing your spending summary now.' };
  }

  // 3. Delete last
  if (lower.includes('delete') && (lower.includes('last') || lower.includes('latest'))) {
    actions.push({ type: 'DELETE_LAST' });
    return { actions, spokenReply: 'Deleted your last expense.' };
  }

  // 4. Reminders & Tasks
  let cleanText = transcript;
  const reminderMatch = cleanText.match(/(?:remind\s+me\s+to|set\s+a?\s*reminder\s+for|reminder\s+to)\s+(.+?)(?=(?:\s+and\s+(?:spent|spend|paid|\d+))|$)/i);
  if (reminderMatch) {
    const full = reminderMatch[0];
    let title = reminderMatch[1].trim();
    let dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 1);
    if (lower.includes('friday')) {
      const day = dueDate.getDay();
      const diff = (5 - day + 7) % 7 || 7;
      dueDate.setDate(dueDate.getDate() + diff);
    } else if (lower.includes('tomorrow')) {
      dueDate.setDate(now.getDate() + 1);
    }
    dueDate.setHours(10, 0, 0, 0);

    title = title.replace(/\s+(?:on\s+friday|tomorrow|next\s+week|at\s+\d+.*)$/i, '').trim();

    actions.push({
      type: 'ADD_REMINDER',
      title: title || 'Reminder',
      dueDate: dueDate.toISOString(),
    });
    cleanText = cleanText.replace(full, ' ');
  }

  const taskMatch = cleanText.match(/(?:add\s+task|new\s+task|task\s+to)\s+(.+?)(?=(?:\s+and\s+(?:spent|spend|paid|\d+))|$)/i);
  if (taskMatch) {
    const full = taskMatch[0];
    let title = taskMatch[1].trim();
    actions.push({
      type: 'ADD_TASK',
      title: title || 'Task',
      dueDate: null,
    });
    cleanText = cleanText.replace(full, ' ');
  }

  // 5. Multiple / Compound Expenses (e.g. "I spend 350 on swigy and 250 on zomato")
  cleanText = cleanText.replace(/^(?:i\s+|please\s+|can\s+you\s+)+/i, '');

  const clauses = cleanText.split(/\s*(?:,\s*|\s+and\s+|\s+plus\s+|\s+aur\s+|\s*;\s*)\s*/i);

  for (const clause of clauses) {
    const trimmed = clause.trim();
    if (!trimmed) continue;

    // Pattern A: (spent/paid/spend) 350 (rupees/rs/inr) on/for/at swiggy
    // Pattern B: 350 (rupees/rs/inr) on/for/at swiggy
    // Pattern C: swiggy 350
    const m = trimmed.match(/(?:spent|paid|spend|kharch(?:e|ed)?|kharch kiye)?\s*(?:₹|rs\.?|rupees|inr)?\s*(\d+(?:\.\d+)?)\s*(?:rupees|rs\.?|inr|₹)?\s*(?:on|for|in|at|to)?\s*(.+)/i) ||
              trimmed.match(/(?:paid|to)?\s*([a-zA-Z\s]+?)\s*(?:₹|rs\.?|rupees|inr)?\s*(\d+(?:\.\d+)?)\s*(?:rupees|rs\.?|inr|₹)?$/i);

    if (m) {
      let amount, rawNote;
      if (!isNaN(parseFloat(m[1]))) {
        amount = parseFloat(m[1]);
        rawNote = (m[2] || '').trim();
      } else {
        rawNote = (m[1] || '').trim();
        amount = parseFloat(m[2]);
      }

      rawNote = rawNote
        .replace(/^(?:on|for|at|to|in)\s+/i, '')
        .replace(/\s+(?:rupees|rs|inr|only)$/i, '')
        .replace(/^(?:my\s+|a\s+|an\s+)/i, '')
        .trim();

      if (amount > 0 && rawNote) {
        let cleanNote = rawNote.charAt(0).toUpperCase() + rawNote.slice(1);
        if (/^swigy$/i.test(cleanNote)) cleanNote = 'Swiggy';
        if (/^zomato$/i.test(cleanNote)) cleanNote = 'Zomato';

        actions.push({
          type: 'ADD_EXPENSE',
          amount,
          currency: 'INR',
          category: categorizeExpenseNote(rawNote),
          note: cleanNote,
          date: now.toISOString(),
        });
      }
    }
  }

  if (actions.length === 0) {
    return {
      actions: [],
      spokenReply: "I couldn't detect any expenses or tasks in that command. Please try saying, for example: 'Spent 350 on Swiggy and 250 on Zomato'.",
    };
  }

  // Format Spoken Reply
  let spokenReply = '';
  const expenses = actions.filter((a) => a.type === 'ADD_EXPENSE');
  const reminders = actions.filter((a) => a.type === 'ADD_REMINDER');
  const tasks = actions.filter((a) => a.type === 'ADD_TASK');

  if (expenses.length > 0 && (reminders.length > 0 || tasks.length > 0)) {
    const expText = expenses.map((e) => `₹${e.amount} for ${e.note}`).join(' and ');
    const extra = [...reminders.map((r) => `reminder "${r.title}"`), ...tasks.map((t) => `task "${t.title}"`)].join(' and ');
    spokenReply = `Done! Added ${expText}, and created ${extra}.`;
  } else if (expenses.length > 1) {
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const details = expenses.map((e) => `₹${e.amount} on ${e.note}`).join(' and ');
    spokenReply = `Done! Added ${details} (Total: ₹${total}).`;
  } else if (expenses.length === 1) {
    spokenReply = `Done! Your ₹${expenses[0].amount} ${expenses[0].note} expense has been saved.`;
  } else if (reminders.length > 0) {
    spokenReply = `Your reminder "${reminders[0].title}" has been created.`;
  } else if (tasks.length > 0) {
    spokenReply = `Your task "${tasks[0].title}" has been created.`;
  } else {
    spokenReply = 'Action completed.';
  }

  return { actions, spokenReply };
}

/**
 * Process a voice command using Gemini AI.
 */
async function processWithGemini({ transcript, timezone, currentDateISO }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[AI] GEMINI_API_KEY not configured. Using fallback parser.');
    return fallbackParseVoiceCommand(transcript, currentDateISO);
  }

  const ai = new GoogleGenAI({ apiKey });
  let model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  // Normalize deprecated model names
  if (model === 'gemini-2.0-flash') {
    model = 'gemini-3.8-flash';
  }

  const systemPrompt = buildSystemPrompt(currentDateISO, timezone);

  let lastError = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const userMessage = attempt === 0
      ? transcript
      : `${transcript}\n\nIMPORTANT: You MUST respond with valid JSON only. No markdown, no code blocks. Just the raw JSON object with "actions" array and "spokenReply" string.`;

    try {
      const response = await ai.models.generateContent({
        model,
        contents: userMessage,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.1,
        },
      });

      const responseText = response.text;
      const parsed = parseJsonResponse(responseText);
      const validated = aiResponseSchema.parse(parsed);
      return validated;
    } catch (error) {
      lastError = error;
      console.warn(`[AI] Attempt ${attempt + 1} with model ${model} failed:`, error.message);
    }
  }

  console.warn('[AI] Gemini API failed. Using fallback parser:', lastError?.message);
  return fallbackParseVoiceCommand(transcript, currentDateISO);
}

/**
 * Stub for Anthropic provider.
 */
async function processWithAnthropic({ transcript, timezone, currentDateISO }) {
  // Anthropic integration stub — structure is ready but Gemini is the primary provider.
  throw new Error('Anthropic provider is not yet fully implemented. Set AI_PROVIDER=gemini to use Gemini.');
}

/**
 * Main entry point: process a voice command with the configured AI provider.
 */
export async function processVoiceCommand({ transcript, timezone, currentDateISO, language }) {
  const provider = process.env.AI_PROVIDER || 'gemini';

  switch (provider) {
    case 'gemini':
      return processWithGemini({ transcript, timezone, currentDateISO, language });
    case 'anthropic':
      return processWithAnthropic({ transcript, timezone, currentDateISO, language });
    default:
      throw new Error(`Unknown AI provider: ${provider}. Use 'gemini' or 'anthropic'.`);
  }
}

