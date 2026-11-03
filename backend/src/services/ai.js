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
  // Strip markdown code fences
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  return JSON.parse(cleaned);
}

/**
 * Process a voice command using Gemini AI.
 */
async function processWithGemini({ transcript, timezone, currentDateISO }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
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
      console.warn(`[AI] Attempt ${attempt + 1} failed:`, error.message);
    }
  }

  throw new Error(`AI processing failed after 2 attempts: ${lastError?.message}`);
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

