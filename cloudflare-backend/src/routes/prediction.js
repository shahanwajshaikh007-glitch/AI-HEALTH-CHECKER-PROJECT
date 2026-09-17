/**
 * Prediction and Assessment routes for Cloudflare Workers & D1.
 */
import { Hono } from 'hono';
import { authMiddleware } from '../auth.js';
import { extractSymptomsAndEmergencies } from '../nlp/extractor.js';
import { predictDisease } from '../ml/predictor.js';

const prediction = new Hono();

prediction.use('*', authMiddleware);

function generateId(prefix = 'ass') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

// POST /api/prediction
prediction.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => null);

  if (!body || (!body.symptoms && !body.raw_text)) {
    return c.json({ detail: 'Either selected symptoms or text description is required.' }, 400);
  }

  const allSymptoms = Array.isArray(body.symptoms) ? [...body.symptoms] : [];
  let isEmergency = false;
  const emergencyWarnings = [];

  // NLP check if raw_text is provided
  if (body.raw_text) {
    const nlp = extractSymptomsAndEmergencies(body.raw_text);
    for (const sym of nlp.detectedSymptoms) {
      if (!allSymptoms.includes(sym)) {
        allSymptoms.push(sym);
      }
    }
    if (nlp.isEmergency) {
      isEmergency = true;
      emergencyWarnings.push(...nlp.emergencyWarnings);
    }
  }

  // Emergency triggers check
  for (const sym of allSymptoms) {
    const sLow = sym.toLowerCase();
    if (sLow === 'chest pain' || sLow === 'shortness of breath') {
      isEmergency = true;
      const warn = `Urgent attention advised for ${sym}.`;
      if (!emergencyWarnings.includes(warn)) {
        emergencyWarnings.push(warn);
      }
    }
  }

  // Run ML predictor
  const predictionResult = predictDisease(
    allSymptoms,
    body.duration || '1-3 days',
    body.severity || 'Moderate',
    user.age,
    user.gender
  );

  const db = c.env.DB;
  const assessmentId = generateId('ass');
  const predictionId = generateId('prd');
  const now = new Date().toISOString();

  // Save assessment to D1
  await db.prepare(`
    INSERT INTO assessments (
      id, user_id, raw_symptoms_text, symptoms, duration, severity,
      input_method, existing_conditions, current_medications,
      is_emergency, emergency_warnings, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    assessmentId,
    user.id,
    body.raw_text || allSymptoms.join(', '),
    JSON.stringify(allSymptoms),
    body.duration || '1-3 days',
    body.severity || 'Moderate',
    body.input_method || (body.raw_text && body.raw_text.toLowerCase().includes('voice') ? 'voice' : 'text'),
    body.existing_conditions || null,
    body.current_medications || null,
    isEmergency ? 1 : 0,
    JSON.stringify(emergencyWarnings),
    now
  ).run();

  // Save prediction to D1
  await db.prepare(`
    INSERT INTO predictions (
      id, assessment_id, user_id, top_prediction, confidence,
      description, advice, top_3_conditions, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    predictionId,
    assessmentId,
    user.id,
    predictionResult.top_prediction,
    predictionResult.confidence,
    predictionResult.description || '',
    predictionResult.advice || '',
    JSON.stringify(predictionResult.top_3_conditions),
    now
  ).run();

  return c.json({
    assessment_id: assessmentId,
    created_at: now,
    symptoms: allSymptoms,
    is_emergency: isEmergency,
    emergency_warnings: emergencyWarnings,
    top_prediction: predictionResult.top_prediction,
    confidence: predictionResult.confidence,
    description: predictionResult.description,
    advice: predictionResult.advice,
    top_3_conditions: predictionResult.top_3_conditions
  });
});

// GET /api/prediction/history
prediction.get('/history', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const { results: assessments } = await db.prepare(`
    SELECT a.*, p.top_prediction, p.confidence, p.top_3_conditions as top_3_json
    FROM assessments a
    LEFT JOIN predictions p ON p.assessment_id = a.id
    WHERE a.user_id = ?
    ORDER BY a.created_at DESC
  `).bind(user.id).all();

  const formatted = (assessments || []).map(a => {
    let symptomsList = [];
    try { symptomsList = JSON.parse(a.symptoms); } catch (e) { symptomsList = []; }

    let warningsList = [];
    try { warningsList = JSON.parse(a.emergency_warnings); } catch (e) { warningsList = []; }

    let top3 = [];
    try { top3 = JSON.parse(a.top_3_json); } catch (e) { top3 = []; }

    return {
      id: a.id,
      created_at: a.created_at,
      raw_text: a.raw_symptoms_text,
      symptoms: symptomsList,
      duration: a.duration,
      severity: a.severity,
      input_method: a.input_method || 'text',
      is_emergency: a.is_emergency === 1,
      emergency_warnings: warningsList,
      top_prediction: a.top_prediction || 'General Assessment',
      confidence: a.confidence || 0,
      top_3_conditions: top3
    };
  });

  return c.json({ assessments: formatted });
});

// GET /api/prediction/:id
prediction.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const db = c.env.DB;

  const assessment = await db.prepare('SELECT * FROM assessments WHERE id = ? AND user_id = ?').bind(id, user.id).first();
  if (!assessment) {
    return c.json({ detail: 'Assessment not found.' }, 404);
  }

  const pred = await db.prepare('SELECT * FROM predictions WHERE assessment_id = ?').bind(id).first();

  let symptomsList = [];
  try { symptomsList = JSON.parse(assessment.symptoms); } catch (e) {}

  let warningsList = [];
  try { warningsList = JSON.parse(assessment.emergency_warnings); } catch (e) {}

  let top3 = [];
  try { top3 = JSON.parse(pred?.top_3_conditions || '[]'); } catch (e) {}

  return c.json({
    assessment: {
      id: assessment.id,
      symptoms: symptomsList,
      duration: assessment.duration,
      severity: assessment.severity,
      created_at: assessment.created_at,
      is_emergency: assessment.is_emergency === 1,
      emergency_warnings: warningsList
    },
    prediction: pred ? {
      top_prediction: pred.top_prediction,
      confidence: pred.confidence,
      description: pred.description,
      advice: pred.advice,
      top_3_conditions: top3
    } : null
  });
});

// DELETE /api/prediction/history/:id or /api/prediction/:id
async function handleDelete(c) {
  const user = c.get('user');
  const id = c.req.param('id');
  const db = c.env.DB;

  const assessment = await db.prepare('SELECT id FROM assessments WHERE id = ? AND user_id = ?').bind(id, user.id).first();
  if (!assessment) {
    return c.json({ detail: 'Assessment not found.' }, 404);
  }

  await db.batch([
    db.prepare('DELETE FROM assessments WHERE id = ?').bind(id),
    db.prepare('DELETE FROM predictions WHERE assessment_id = ?').bind(id),
    db.prepare('DELETE FROM reports WHERE assessment_id = ?').bind(id)
  ]);

  return c.json({ message: 'Assessment deleted successfully.' });
}

prediction.delete('/history/:id', handleDelete);
prediction.delete('/:id', handleDelete);

export default prediction;
