import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function testModel(m) {
  try {
    const res = await ai.models.generateContent({ model: m, contents: 'Say hi in 1 word' });
    console.log(m, 'SUCCESS:', res.text.trim());
  } catch (e) {
    console.log(m, 'FAILED:', e.message.substring(0, 120));
  }
}

async function run() {
  await testModel('gemini-2.5-flash');
  await testModel('gemini-2.5-flash-lite');
  await testModel('gemini-1.5-flash');
}

run();

