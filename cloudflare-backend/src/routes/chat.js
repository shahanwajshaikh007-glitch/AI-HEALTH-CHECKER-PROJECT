/**
 * AI Medical Assistant Chat routes for Cloudflare Workers & D1.
 * Integrates Cloudflare Workers AI with fallback medical intelligence.
 */
import { Hono } from 'hono';
import { authMiddleware } from '../auth.js';

const chat = new Hono();

chat.use('*', authMiddleware);

function generateId(prefix = 'msg') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

async function generateMedicalReply(c, userMsg, context) {
  // 1. Try Cloudflare Workers AI if available
  if (c.env.AI && typeof c.env.AI.run === 'function') {
    try {
      let prompt = "You are an empathetic, professional AI Medical Assistant. Provide accurate, helpful health information in plain language. Always include a disclaimer that you are an AI assistant and not a substitute for a doctor.\n";
      if (context) {
        prompt += `Recent Assessment Context: ${context}\n`;
      }
      prompt += `User Question: ${userMsg}`;

      const aiRes = await c.env.AI.run('@cf/meta/llama-3-8b-instruct', {
        messages: [
          { role: 'system', content: 'You are an empathetic, professional AI Medical Assistant.' },
          { role: 'user', content: prompt }
        ]
      });

      if (aiRes && aiRes.response) {
        return aiRes.response.trim();
      }
    } catch (e) {
      console.warn('Workers AI call skipped or failed, using local medical intelligence fallback:', e.message);
    }
  }

  // 2. Structured Medical Intelligence Fallback
  const msgLower = (userMsg || '').toLowerCase();

  if (msgLower.includes('fever')) {
    return (
      "🌡️ **Managing Fever:**\n" +
      "- Stay well-hydrated with fluids like water, warm broth, or electrolyte drinks.\n" +
      "- Get plenty of rest in a cool, comfortable room.\n" +
      "- Over-the-counter paracetamol/acetaminophen can help lower fever.\n\n" +
      "⚠️ *Seek emergency care if fever exceeds 103°F (39.4°C), lasts >3 days, or is accompanied by stiff neck, confusion, or breathing trouble.*"
    );
  } else if (msgLower.includes('cough') || msgLower.includes('cold')) {
    return (
      "😷 **Cough & Cold Relief:**\n" +
      "- Honey and warm fluids (like herbal tea) can soothe throat irritation.\n" +
      "- Use a steam humidifier or take a warm shower.\n" +
      "- Rest to give your immune system time to recover.\n\n" +
      "⚠️ *Consult a doctor if you experience difficulty breathing, chest tightness, or cough up blood.*"
    );
  } else if (msgLower.includes('headache') || msgLower.includes('migraine')) {
    return (
      "🧠 **Headache Care:**\n" +
      "- Rest in a quiet, dark room.\n" +
      "- Apply a cool compress to your forehead.\n" +
      "- Stay hydrated and avoid screen strain.\n\n" +
      "⚠️ *Emergency warning: Seek immediate emergency care for sudden severe 'thunderclap' headache or headache with numbness/slurred speech.*"
    );
  } else if (msgLower.includes('diet') || msgLower.includes('food') || msgLower.includes('nutrition')) {
    return (
      "🥗 **General Nutritional Guidance:**\n" +
      "- Eat a balanced diet rich in whole vegetables, fruits, lean protein, and fiber.\n" +
      "- Drink at least 2-3 liters of water daily.\n" +
      "- Limit processed sugars and sodium."
    );
  } else {
    return (
      `Hello! I am your Cloudflare-powered AI Medical Assistant.\n\n` +
      `Regarding your query about *"${userMsg}"*:\n` +
      `• It is important to monitor your symptoms closely.\n` +
      `• Keep track of any changes in severity or duration.\n` +
      `• Ensure adequate rest and fluid intake.\n\n` +
      `💡 *Remember: This information is for educational purposes and does not replace a medical consultation with a qualified doctor.*`
    );
  }
}

// POST /api/chat
chat.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => null);

  if (!body || !body.message || !body.message.trim()) {
    return c.json({ detail: 'Message cannot be empty' }, 400);
  }

  const db = c.env.DB;
  const now = new Date().toISOString();

  // Find or create conversation for user in D1
  let conv = await db.prepare('SELECT id FROM conversations WHERE user_id = ?').bind(user.id).first();
  let convId = conv ? conv.id : null;

  if (!convId) {
    convId = generateId('cnv');
    await db.prepare('INSERT INTO conversations (id, user_id, title, created_at) VALUES (?, ?, ?, ?)').bind(
      convId,
      user.id,
      'Health Consultation',
      now
    ).run();
  }

  // Save user message
  const userMsgId = generateId('msg');
  await db.prepare('INSERT INTO messages (id, conversation_id, user_id, sender, message, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(
    userMsgId,
    convId,
    user.id,
    'user',
    body.message.trim(),
    now
  ).run();

  // Generate reply
  const replyText = await generateMedicalReply(c, body.message, body.assessment_context);
  const aiNow = new Date().toISOString();
  const aiMsgId = generateId('msg');

  // Save AI message
  await db.prepare('INSERT INTO messages (id, conversation_id, user_id, sender, message, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(
    aiMsgId,
    convId,
    user.id,
    'ai',
    replyText,
    aiNow
  ).run();

  return c.json({
    reply: replyText,
    sender: 'ai',
    timestamp: aiNow
  });
});

// GET /api/chat/history
chat.get('/history', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const conv = await db.prepare('SELECT id FROM conversations WHERE user_id = ?').bind(user.id).first();
  if (!conv) {
    return c.json({ messages: [] });
  }

  const { results: msgs } = await db.prepare('SELECT id, sender, message, created_at FROM messages WHERE conversation_id = ? AND user_id = ? ORDER BY created_at ASC').bind(
    conv.id,
    user.id
  ).all();

  return c.json({
    messages: (msgs || []).map(m => ({
      id: m.id,
      sender: m.sender,
      message: m.message,
      created_at: m.created_at
    }))
  });
});

// DELETE /api/chat/history
async function handleClearChat(c) {
  const user = c.get('user');
  const db = c.env.DB;

  const conv = await db.prepare('SELECT id FROM conversations WHERE user_id = ?').bind(user.id).first();
  if (conv) {
    await db.batch([
      db.prepare('DELETE FROM messages WHERE conversation_id = ?').bind(conv.id),
      db.prepare('DELETE FROM conversations WHERE id = ?').bind(conv.id)
    ]);
  }

  return c.json({ message: 'Chat history cleared successfully.' });
}

chat.delete('/history', handleClearChat);
chat.delete('/:id', handleClearChat);

export default chat;
