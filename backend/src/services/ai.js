import { GoogleGenAI } from '@google/genai';
import { aiResponseSchema } from '../utils/validation.js';

const SYSTEM_PROMPT = `You are VoiceLedger AI, an intelligent, friendly, and natural voice assistant for personal finances, expenses, tasks, and daily reminders.
You talk naturally and warmly with the user, like a helpful financial companion.

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

NATURAL CONVERSATION & CHAT RULES:
- If the user engages in casual conversation (e.g. greetings like "hello", "hey", "namaste", affirmations like "yeah yeah yeah", "ok bro", "cool", "sure", questions like "how are you", "who are you", "what can you do", "give me a savings tip", or incomplete phrases like "bro could you", "can you", "listen"):
  - Respond warmly, naturally, and conversationally in "spokenReply".
  - Keep "actions" as an empty array [].
  - NEVER stay silent or return an empty "spokenReply".
- If the user gives a financial or task command:
  - Extract ALL appropriate actions.
  - For compound expenses (e.g. "350 on Swiggy and 250 on Zomato"), extract a separate ADD_EXPENSE action for EACH.
  - Popular delivery and food brands (Swiggy, Zomato, Blinkit, Zepto, McDonald's, Domino's, chai, dinner, lunch) MUST be categorized as "Food".
  - Resolve relative dates (tomorrow, Friday, next week) to ISO dates using the current date.
  - Provide a friendly, concise confirmation in "spokenReply" (1-2 sentences) that will be read aloud to the user.
- For spending queries (e.g. "How much did I spend today?"):
  - Return QUERY_SUMMARY action.
  - Set "spokenReply" to an acknowledging phrase like "Checking your spending summary now." (the server will inject exact calculations).
- Respond in the SAME LANGUAGE or blend as the user (English, Hindi, or Hinglish).
- Always return valid JSON only with keys "actions" (array) and "spokenReply" (string). No markdown, no commentary outside JSON.`;

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
  let cleaned = (text || '').trim();
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }
  try {
    return JSON.parse(cleaned);
  } catch (e) {
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
  if (/swiggy|swigy|zomato|blinkit|zepto|instamart|food|lunch|dinner|breakfast|canteen|coffee|tea|chai|cafe|burger|pizza|dosa|samosa|restaurant|khana|grocer|subzi|fruits|milk|mcdonald|domino|kfc|snack|momo|biryani|paneer|roti|bakery/i.test(n)) {
    return 'Food';
  }
  if (/uber|ola|rapido|cab|auto|taxi|metro|bus|train|flight|petrol|diesel|fuel|transport|travel|toll|parking|fare/i.test(n)) {
    return 'Transport';
  }
  if (/amazon|flipkart|myntra|ajio|meesho|shopping|clothes|shirt|pant|shoes|dress|mall|zara|h&m|earphones|headphones|electronics/i.test(n)) {
    return 'Shopping';
  }
  if (/bill|electricity|water|wifi|broadband|recharge|mobile|jio|airtel|rent|maintenance|gas|dth/i.test(n)) {
    return 'Bills';
  }
  if (/doctor|medicine|pharmacy|hospital|clinic|test|gym|health|fitness|dentist|tablet/i.test(n)) {
    return 'Health';
  }
  if (/movie|cinema|netflix|prime|hotstar|spotify|game|party|club|entertainment|concert|event/i.test(n)) {
    return 'Entertainment';
  }
  if (/book|course|college|school|tuition|pen|exam|fee|education|udemy|coursera|assignment|stationery/i.test(n)) {
    return 'Education';
  }
  return 'Other';
}

/**
 * Natural conversational fallback parser.
 * Used when Gemini is unavailable or rate-limited.
 */
function fallbackParseVoiceCommand(transcript, currentDateISO) {
  const actions = [];
  const lower = (transcript || '').toLowerCase().trim();
  const now = new Date(currentDateISO || new Date());

  // 1. Casual banter, confirmations & affirmations
  if (/^(?:yeah|yes|ok|okay|yep|sure|alright|fine|cool|haan|theek\s+hai|bilkul|sahi\s+hai)(?:\s+(?:yeah|yes|ok|okay|bro|man|dude|bhai|ji))*$/i.test(lower)) {
    const replies = [
      "I'm ready! What expense or reminder would you like to add?",
      "Got it! What can I record for you?",
      "Awesome, I'm listening. Tell me what you'd like to track.",
    ];
    return {
      actions: [],
      spokenReply: replies[Math.floor(Math.random() * replies.length)],
    };
  }

  // 2. Incomplete or prompt requests
  if (/^(?:bro|hey\s+bro|bhai|can\s+you|could\s+you|bro\s+could\s+you|please|suno|listen)\b/i.test(lower) && !/\d+/.test(lower)) {
    return {
      actions: [],
      spokenReply: "I'm right here! Tell me what you'd like to record, like 'Spent 200 on lunch' or set a reminder.",
    };
  }

  // 3. Greetings
  if (/^(?:hi|hello|hey|hola|namaste|good\s+(?:morning|afternoon|evening)|yo|wassup|hey\s+there)\b/i.test(lower)) {
    return {
      actions: [],
      spokenReply: "Hello! I am your VoiceLedger assistant. You can tell me your expenses, tasks, or ask about your spending.",
    };
  }

  // 4. Well-being
  if (/\b(?:how\s+are\s+you|how's\s+it\s+going|kaise\s+ho|kya\s+haal\s+hai)\b/i.test(lower)) {
    return {
      actions: [],
      spokenReply: "I'm doing great, thank you! Ready to help you track expenses and tasks. What's on your mind?",
    };
  }

  // 5. Identity & Capabilities
  if (/\b(?:who\s+are\s+you|what\s+can\s+you\s+do|what\s+are\s+you|help(?:\s+me)?|kya\s+kar\s+sakte\s+ho|guide\s+me)\b/i.test(lower)) {
    return {
      actions: [],
      spokenReply: "I am VoiceLedger, your smart voice assistant. You can tell me your expenses, set reminders, create tasks, or ask 'How much did I spend this week?'",
    };
  }

  // 6. Gratitude & Compliments
  if (/\b(?:thanks|thank\s+you|dhanyawad|shukriya|great\s+job|awesome|nice|cool)\b/i.test(lower)) {
    return {
      actions: [],
      spokenReply: "You're very welcome! Feel free to let me know whenever you have an expense or task to track.",
    };
  }

  // 7. Goodbyes
  if (/\b(?:bye|goodbye|see\s+you|good\s*night|alvida|tata)\b/i.test(lower)) {
    return {
      actions: [],
      spokenReply: "Goodbye! Have a great day, and keep track of your budget!",
    };
  }

  // 8. Financial advice & tips
  if (/\b(?:save\s+money|saving\s+tips|budget\s+tip|how\s+to\s+save)\b/i.test(lower)) {
    return {
      actions: [],
      spokenReply: "A great rule of thumb is the 50-30-20 rule: 50% for needs, 30% for wants, and 20% for savings and investments. Try tracking your small daily expenses first!",
    };
  }

  // 9. Light humor / jokes
  if (/\b(?:joke|funny|make\s+me\s+laugh)\b/i.test(lower)) {
    return {
      actions: [],
      spokenReply: "Why did the rupee go to school? To get a little change! Now, what expense should we record?",
    };
  }

  // 10. Spending query
  if (lower.includes('how much') || lower.includes('show my') || lower.includes('what was my') || lower.includes('summary') || lower.includes('kitna kharch')) {
    let period = 'today';
    if (lower.includes('week') || lower.includes('hafte')) period = 'week';
    if (lower.includes('month') || lower.includes('mahine')) period = 'month';
    if (lower.includes('all') || lower.includes('total') || lower.includes('sab')) period = 'all';
    actions.push({ type: 'QUERY_SUMMARY', period, category: null });
    return { actions, spokenReply: 'Checking your spending summary now.' };
  }

  // 11. Email command
  if (lower.includes('email') || lower.includes('send summary')) {
    actions.push({
      type: 'SEND_EMAIL',
      subject: 'Weekly Spending Summary',
      body: 'Your weekly spending summary from VoiceLedger',
    });
    return { actions, spokenReply: 'I am emailing your spending summary now.' };
  }

  // 12. Delete last
  if (lower.includes('delete') && (lower.includes('last') || lower.includes('latest') || lower.includes('undo'))) {
    actions.push({ type: 'DELETE_LAST' });
    return { actions, spokenReply: 'Deleted your last expense.' };
  }

  // 13. Reminders & Tasks
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

  // 14. Multiple / Compound Expenses
  cleanText = cleanText.replace(/^(?:i\s+|please\s+|can\s+you\s+)+/i, '');
  const clauses = cleanText.split(/\s*(?:,\s*|\s+and\s+|\s+plus\s+|\s+aur\s+|\s*;\s*)\s*/i);

  for (const clause of clauses) {
    const trimmed = clause.trim();
    if (!trimmed) continue;

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
      spokenReply: "I'm listening! You can tell me an expense like 'Spent 200 on lunch' or set a reminder.",
    };
  }

  // Format Spoken Reply
  let spokenReply = '';
  const expenses = actions.filter((a) => a.type === 'ADD_EXPENSE');
  const reminders = actions.filter((a) => a.type === 'ADD_REMINDER');
  const tasks = actions.filter((a) => a.type === 'ADD_TASK');

  if (expenses.length > 0 && (reminders.length > 0 || tasks.length > 0)) {
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const extra = [...reminders.map((r) => `reminder "${r.title}"`), ...tasks.map((t) => `task "${t.title}"`)].join(' and ');
    spokenReply = `Done! Added ₹${total} in expenses, and created ${extra}.`;
  } else if (expenses.length > 1) {
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    spokenReply = `Done! Added ₹${total} across ${expenses.length} expenses.`;
  } else if (expenses.length === 1) {
    spokenReply = `Done! Your ₹${expenses[0].amount} ${expenses[0].note} expense has been saved.`;
  } else if (reminders.length > 0) {
    spokenReply = `Your reminder "${reminders[0].title}" has been created.`;
  } else if (tasks.length > 0) {
    spokenReply = `Your task "${tasks[0].title}" has been created.`;
  } else {
    spokenReply = 'Done! Your request has been recorded.';
  }

  return { actions, spokenReply };
}

/**
 * Process a voice command using Gemini AI with model fallback and conversational history.
 */
async function processWithGemini({ transcript, timezone, currentDateISO, conversationHistory }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[AI] GEMINI_API_KEY not configured. Using fallback parser.');
    return fallbackParseVoiceCommand(transcript, currentDateISO);
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // Model priority list: try preferred model, then light/preview models with independent quotas
  const candidateModels = [
    process.env.GEMINI_MODEL || 'gemini-flash-lite-latest',
    'gemini-flash-lite-latest',
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash-lite',
  ].filter((v, idx, arr) => arr.indexOf(v) === idx);

  const systemPrompt = buildSystemPrompt(currentDateISO, timezone);

  // Build conversational context if history is provided
  let userMessage = transcript;
  if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
    const recent = conversationHistory.slice(-4);
    const historyText = recent
      .map((m) => `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.text}`)
      .join('\n');
    userMessage = `Recent Conversation Context:\n${historyText}\n\nCurrent User Input: ${transcript}`;
  }

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: userMessage,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.2,
        },
      });

      const responseText = response.text;
      const parsed = parseJsonResponse(responseText);
      const validated = aiResponseSchema.parse(parsed);

      // Ensure spokenReply is never empty
      if (!validated.spokenReply || !validated.spokenReply.trim()) {
        validated.spokenReply = validated.actions.length > 0
          ? 'Done! I have recorded that for you.'
          : "I'm listening! Tell me an expense to add or a task to set.";
      }

      return validated;
    } catch (error) {
      console.warn(`[AI] Model ${model} failed (${error.message?.slice(0, 120)}). Trying next candidate...`);
    }
  }

  console.warn('[AI] All Gemini models exhausted or failed. Using fallback conversational parser.');
  return fallbackParseVoiceCommand(transcript, currentDateISO);
}

/**
 * Stub for Anthropic provider.
 */
async function processWithAnthropic({ transcript, timezone, currentDateISO }) {
  throw new Error('Anthropic provider is not yet fully implemented. Set AI_PROVIDER=gemini to use Gemini.');
}

/**
 * Main entry point: process a voice command with the configured AI provider.
 */
export async function processVoiceCommand({ transcript, timezone, currentDateISO, language, conversationHistory }) {
  const provider = process.env.AI_PROVIDER || 'gemini';

  switch (provider) {
    case 'gemini':
      return processWithGemini({ transcript, timezone, currentDateISO, language, conversationHistory });
    case 'anthropic':
      return processWithAnthropic({ transcript, timezone, currentDateISO, language, conversationHistory });
    default:
      throw new Error(`Unknown AI provider: ${provider}. Use 'gemini' or 'anthropic'.`);
  }
}
