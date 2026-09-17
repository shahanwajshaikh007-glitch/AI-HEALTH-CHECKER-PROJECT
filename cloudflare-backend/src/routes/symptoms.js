/**
 * Symptoms routes for Cloudflare Workers & D1.
 */
import { Hono } from 'hono';
import { extractSymptomsAndEmergencies } from '../nlp/extractor.js';

const symptoms = new Hono();

// GET /api/symptoms
symptoms.get('/', async (c) => {
  const db = c.env.DB;
  const { results } = await db.prepare('SELECT id, name, normalized_name, category, description FROM symptoms ORDER BY name ASC').all();

  return c.json({
    symptoms: results || []
  });
});

// POST /api/symptoms/analyze
symptoms.post('/analyze', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || !body.text || !body.text.trim()) {
    return c.json({ detail: 'Please provide symptoms text to analyze.' }, 400);
  }

  const { detectedSymptoms, isEmergency, emergencyWarnings } = extractSymptomsAndEmergencies(body.text);

  return c.json({
    raw_text: body.text,
    extracted_symptoms: detectedSymptoms,
    is_emergency: isEmergency,
    emergency_warnings: emergencyWarnings,
    count: detectedSymptoms.length
  });
});

export default symptoms;
