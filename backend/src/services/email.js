import { Resend } from 'resend';
import { getSummary } from './summary.js';

export async function sendEmail({ to, subject, body, userEmail }) {
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  let emailTo = to;
  if (!emailTo || emailTo === 'my email address' || emailTo === 'user@example.com' || !emailTo.includes('@')) {
    emailTo = userEmail || process.env.DEFAULT_EMAIL_TO || (emailTo?.includes('@') ? emailTo : 'demo@voiceledger.app');
  }

  // If body is generic, compute live weekly summary from PostgreSQL
  let emailContent = body;
  if (!emailContent || emailContent.toLowerCase().includes('summary') || emailContent.length < 20) {
    try {
      const summary = await getSummary('week');
      emailContent = `Weekly Spending Summary (Calculated from PostgreSQL):\n` +
        `Total Spent: ₹${summary.totalAmount.toFixed(2)}\n` +
        `Transactions: ${summary.count}\n\n` +
        `Category Breakdown:\n` +
        summary.byCategory.map((c) => `• ${c.category}: ₹${c.total.toFixed(2)} (${c.count} items)`).join('\n') +
        (body ? `\n\nAI Notes:\n${body}` : '');
    } catch (err) {
      console.warn('Could not enrich email with summary:', err.message);
    }
  }

  const emailSubject = subject || 'VoiceLedger Spending Summary';

  // MOCK mode
  if (!resend || !process.env.RESEND_API_KEY) {
    console.log('[EMAIL MOCK]', { to: emailTo, subject: emailSubject, body: emailContent });
    return {
      success: true,
      mock: true,
      recipient: emailTo,
      subject: emailSubject,
      message: 'Email processed in MOCK mode (Resend API key not configured in environment).',
    };
  }

  // REAL mode
  const result = await resend.emails.send({
    from: process.env.EMAIL_FROM || 'VoiceLedger <onboarding@resend.dev>',
    to: emailTo,
    subject: emailSubject,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #0f1225; color: #f8fafc; border-radius: 16px;">
        <div style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 16px; margin-bottom: 20px;">
          <h1 style="color: #8b5cf6; margin: 0; font-size: 24px;">VoiceLedger</h1>
          <p style="color: #94a3b8; margin: 4px 0 0; font-size: 13px;">Speak. Track. Remember.</p>
        </div>
        <h2 style="font-size: 18px; margin-top: 0; color: #ffffff;">${emailSubject}</h2>
        <div style="background-color: #1a1f3a; padding: 18px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${emailContent}</div>
        <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 24px 0 16px;">
        <p style="color: #64748b; font-size: 12px; margin: 0;">Sent automatically by VoiceLedger AI Voice Assistant</p>
      </div>
    `,
  });

  return { success: true, mock: false, id: result.data?.id, recipient: emailTo };
}

