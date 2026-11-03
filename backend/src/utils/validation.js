import { z } from 'zod';

// --- Expense Categories (matching Prisma enum) ---
export const EXPENSE_CATEGORIES = [
  'Food', 'Transport', 'Shopping', 'Bills', 'Health', 'Entertainment', 'Education', 'Other',
];

// --- Expense Schemas ---
export const createExpenseSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0'),
  currency: z.string().default('INR'),
  category: z.enum(EXPENSE_CATEGORIES).default('Other'),
  note: z.string().default(''),
  date: z.string().datetime({ offset: true }).optional(),
});

export const updateExpenseSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0').optional(),
  currency: z.string().optional(),
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  note: z.string().optional(),
  date: z.string().datetime({ offset: true }).optional(),
});

// --- Task Schemas ---
export const TASK_TYPES = ['TASK', 'REMINDER'];

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: z.enum(TASK_TYPES).default('TASK'),
  dueDate: z.string().datetime({ offset: true }).nullable().optional(),
  completed: z.boolean().default(false),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.enum(TASK_TYPES).optional(),
  dueDate: z.string().datetime({ offset: true }).nullable().optional(),
  completed: z.boolean().optional(),
  notified: z.boolean().optional(),
});

// --- Voice Command Schema ---
export const voiceCommandSchema = z.object({
  transcript: z.string().min(1, 'Transcript is required'),
  timezone: z.string().default('Asia/Kolkata'),
  currentDateISO: z.string().optional(),
  language: z.string().default('en-IN'),
  userEmail: z.string().optional(),
});

// Category normalizer to ensure case-insensitive matching with Prisma enum
const normalizedCategory = z.preprocess((val) => {
  if (typeof val !== 'string') return 'Other';
  const cap = val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
  return EXPENSE_CATEGORIES.includes(cap) ? cap : 'Other';
}, z.enum(EXPENSE_CATEGORIES));

// --- AI Action Schemas ---
const addExpenseActionSchema = z.object({
  type: z.literal('ADD_EXPENSE'),
  amount: z.number().positive(),
  currency: z.string().optional().default('INR'),
  category: normalizedCategory.optional().default('Other'),
  note: z.string().optional().default(''),
  date: z.string().optional(),
});

const addReminderActionSchema = z.object({
  type: z.literal('ADD_REMINDER'),
  title: z.string().min(1),
  dueDate: z.string().nullable().optional(),
});

const addTaskActionSchema = z.object({
  type: z.literal('ADD_TASK'),
  title: z.string().min(1),
  dueDate: z.string().nullable().optional(),
});

const sendEmailActionSchema = z.object({
  type: z.literal('SEND_EMAIL'),
  to: z.string().optional(),
  subject: z.string().optional().default('VoiceLedger Spending Summary'),
  body: z.string().optional().default(''),
});

const querySummaryActionSchema = z.object({
  type: z.literal('QUERY_SUMMARY'),
  period: z.enum(['today', 'week', 'month', 'all']).optional().default('today'),
  category: z.string().nullable().optional(),
});

const deleteLastActionSchema = z.object({
  type: z.literal('DELETE_LAST'),
});

export const actionSchema = z.discriminatedUnion('type', [
  addExpenseActionSchema,
  addReminderActionSchema,
  addTaskActionSchema,
  sendEmailActionSchema,
  querySummaryActionSchema,
  deleteLastActionSchema,
]);

export const aiResponseSchema = z.object({
  actions: z.array(actionSchema),
  spokenReply: z.string(),
});

// --- Demo Schemas ---
export const resetConfirmSchema = z.object({
  confirm: z.literal('RESET', { errorMap: () => ({ message: 'Body must include { "confirm": "RESET" }' }) }),
});

