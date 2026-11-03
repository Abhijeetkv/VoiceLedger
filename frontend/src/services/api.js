import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// Attach JWT token to requests if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('voiceledger_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Authentication
export const login = (data) => api.post('/auth/login', data);
export const signup = (data) => api.post('/auth/signup', data);
export const loginDemo = () => api.post('/auth/demo');
export const getMe = () => api.get('/auth/me');

// Expenses
export const getExpenses = (params) => api.get('/expenses', { params });
export const createExpense = (data) => api.post('/expenses', data);
export const updateExpense = (id, data) => api.patch(`/expenses/${id}`, data);
export const deleteExpense = (id) => api.delete(`/expenses/${id}`);

// Tasks
export const getTasks = (params) => api.get('/tasks', { params });
export const createTask = (data) => api.post('/tasks', data);
export const updateTask = (id, data) => api.patch(`/tasks/${id}`, data);
export const deleteTask = (id) => api.delete(`/tasks/${id}`);

// Voice
export const sendVoiceCommand = (data) => api.post('/voice-command', data);

// Summary
export const getSummary = (period) => api.get('/summary', { params: { period } });

// Reminders
export const getDueReminders = () => api.get('/reminders/due');

// Demo
export const seedDemoData = () => api.post('/demo/seed');
export const resetDemoData = () => api.delete('/demo/reset', { data: { confirm: 'RESET' } });

// Health
export const getHealth = () => api.get('/health');
export const getConfigStatus = () => api.get('/config/status');

export default api;
