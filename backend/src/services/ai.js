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
- Resolve relative dates (tomorrow, Friday, next week) to ISO dates using the current date
- Default currency is INR
- For ambiguous input, return empty actions array and ask a clarification question in spokenReply
- Respond in the SAME LANGUAGE as the user's input
- For Hindi input, respond in Hindi

EXAMPLES:
User: "I spent 250 rupees on lunch"
Response: { "actions": [{ "type": "ADD_EXPENSE", "amount": 250, "currency": "INR", "category": "Food", "note": "Lunch", "date": "{todayISO}" }], "spokenReply": "Done! Your ₹250 lunch expense has been saved." }

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

/**
 * Fallback natural language rule-based parser.
 * Used when Gemini API is unavailable or returns an error.
 */
function fallbackParseVoiceCommand(transcript, currentDateISO) {
  const actions = [];
  const lower = transcript.toLowerCase();
  const now = new Date(currentDateISO || new Date());

  // Spending query
  if (lower.includes('how much') || lower.includes('show my') || lower.includes('what was my') || lower.includes('summary')) {
    let period = 'today';
    if (lower.includes('week')) period = 'week';
    if (lower.includes('month')) period = 'month';
    if (lower.includes('all') || lower.includes('total')) period = 'all';
    actions.push({ type: 'QUERY_SUMMARY', period, category: null });
    return { actions, spokenReply: '' };
  }

  // Email command
  if (lower.includes('email') || lower.includes('send summary')) {
    actions.push({
      type: 'SEND_EMAIL',
      subject: 'Weekly Spending Summary',
      body: 'Your weekly spending summary from VoiceLedger',
    });
  }

  // Delete last
  if (lower.includes('delete') && (lower.includes('last') || lower.includes('latest'))) {
    actions.push({ type: 'DELETE_LAST' });
    return { actions, spokenReply: 'Deleted your last expense.' };
  }

  // Expense (e.g. spent 250 rupees on lunch)
  const expenseMatch = transcript.match(/(?:spent|paid|spend|kharche?|kharch kiye)\s*(?:₹|rs\.?|rupees)?\s*(\d+(?:\.\d+)?)\s*(?:rupees|rs\.?)?\s*(?:on|for|in)?\s*([a-zA-Z\s]+)?/i) ||
                       transcript.match(/(\d+(?:\.\d+)?)\s*(?:rupees|rs\.?|₹)\s*(?:spent|paid|on)?\s*([a-zA-Z\s]+)?/i);

  if (expenseMatch) {
    const amount = parseFloat(expenseMatch[1]);
    let rawNote = (expenseMatch[2] || 'Expense').trim();
    rawNote = rawNote.split(/\b(?:and\s+remind|and\s+task|and\s+set)\b/i)[0].trim();

    let category = 'Other';
    const noteLower = rawNote.toLowerCase();
    if (/lunch|dinner|breakfast|food|canteen|coffee|tea|burger|pizza|dosa|samosa|restaurant|khana/i.test(noteLower)) category = 'Food';
    else if (/cab|auto|uber|ola|bus|train|flight|petrol|fuel|transport|travel/i.test(noteLower)) category = 'Transport';
    else if (/shopping|clothes|shirt|shoes|amazon|flipkart|myntra|headphones/i.test(noteLower)) category = 'Shopping';
    else if (/bill|recharge|electricity|wifi|broadband|rent/i.test(noteLower)) category = 'Bills';
    else if (/doctor|medicine|hospital|pharmacy|health/i.test(noteLower)) category = 'Health';
    else if (/movie|netflix|game|entertainment/i.test(noteLower)) category = 'Entertainment';
    else if (/book|course|college|tuition|pen|notebook|school|education/i.test(noteLower)) category = 'Education';

    actions.push({
      type: 'ADD_EXPENSE',
      amount,
      currency: 'INR',
      category,
      note: rawNote || 'Expense',
      date: now.toISOString(),
    });
  }

  // Reminder (e.g. remind me to submit college form on Friday / tomorrow)
  const reminderMatch = transcript.match(/remind\s+me\s+to\s+(.*?)(?:\s+on\s+|\s+by\s+|\s+tomorrow|\s+next|\s*$)/i);
  if (reminderMatch) {
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

    actions.push({
      type: 'ADD_REMINDER',
      title: title || 'Reminder',
      dueDate: dueDate.toISOString(),
    });
  }

  if (actions.length === 0) {
    return {
      actions: [],
      spokenReply: "I didn't quite catch that. Could you please specify an expense amount or a reminder task?",
    };
  }

  let spokenReply = 'Done! ';
  const exp = actions.find((a) => a.type === 'ADD_EXPENSE');
  const rem = actions.find((a) => a.type === 'ADD_REMINDER');
  if (exp && rem) {
    spokenReply += `Your ₹${exp.amount} ${exp.note} expense has been saved, and your reminder is set.`;
  } else if (exp) {
    spokenReply += `Your ₹${exp.amount} ${exp.note} expense has been saved.`;
  } else if (rem) {
    spokenReply += `Your reminder "${rem.title}" has been created.`;
  } else {
    spokenReply += `Action completed.`;
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

