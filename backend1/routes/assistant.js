const express = require('express');
const { runAnalysisAgent } = require('../agents/analysisAgent');
const { runRagDoctorQuery, runRagPatientSummary, normalizeConversationHistory } = require('../agents/ragDoctorAgent');
const { runSecondOpinionAgent } = require('../agents/secondOpinionAgent');
const { runTriageAgent } = require('../agents/triageAgent');
const { runReceptionist } = require('../agents/receptionistAgent');
const { runNutritionAgent } = require('../agents/nutritionAgent');
const { getPatientBundle } = require('../repositories/clinicalRepository');
const blockchain = require('../blockchain/logger');

const router = express.Router();

function resolvePatientId(patientId) {
  if (patientId === undefined || patientId === null) return undefined;
  const normalized = String(patientId).trim();
  return normalized || undefined;
}

function buildFallbackSummary(bundle) {
  const patient = bundle?.patient || {};
  const diagnoses = [
    ...(Array.isArray(patient.diagnosis) ? patient.diagnosis : []),
    ...(Array.isArray(patient.primaryDiagnosis) ? patient.primaryDiagnosis : []),
    ...(Array.isArray(patient.secondaryDiagnosis) ? patient.secondaryDiagnosis : []),
  ].filter(Boolean);

  const medications = (bundle?.medications || []).slice(0, 5).map((item) => {
    const name = item.drug || item.name || 'Medication';
    const dose = item.dose || item.dosage || '';
    return dose ? `${name} ${dose}` : name;
  });

  const alerts = (bundle?.alerts || []).slice(0, 3).map((alert) => alert.message || alert.type || 'Clinical alert');
  const latestVisit = bundle?.visits && bundle.visits.length ? bundle.visits[bundle.visits.length - 1] : null;

  return [
    `${patient.age ?? 'Unknown'}-year-old ${String(patient.gender || 'patient').toLowerCase()} with ${diagnoses.length ? diagnoses.join(', ') : 'ongoing clinical care needs'}.`,
    `Current medications: ${medications.length ? medications.join(', ') : 'No active medication list available'}.`,
    `Active alerts: ${alerts.length ? alerts.join('; ') : 'No major alerts recorded'}.`,
    `Last visit: ${latestVisit?.date || 'No recent visit on file'}.`,
    `Recommended next step: continue monitoring and review the care plan based on the latest patient data.`,
  ];
}

router.post('/query', async (req, res) => {
  const { patientId, query, prompt, apiKey, model, allPatients, history } = req.body || {};
  const message = String(query || prompt || '').trim();
  if (!message) {
    return res.status(400).json({ error: 'query or prompt is required' });
  }

  const effectivePatientId = resolvePatientId(patientId) || (allPatients ? 'all-patients' : undefined);
  const conversationHistory = normalizeConversationHistory(history);
  const contextualMessage = conversationHistory.length
    ? `Recent conversation (for context only):\n${conversationHistory.map((turn) => `${turn.role}: ${turn.content}`).join('\n')}\n\nCurrent question:\n${message}`
    : message;
  const traces = [];

  blockchain.addBlock('CLINICAL_QUERY', req.headers['x-actor-id'] || 'SYSTEM', effectivePatientId || 'UNKNOWN', `Assistant query: ${message.slice(0, 120)}`);

  try {
    const ragResult = await runRagDoctorQuery(effectivePatientId, message, apiKey, model, conversationHistory);
    if (!ragResult.error && ragResult.answer) {
      return res.json({
        response: ragResult.answer,
        answer: ragResult.answer,
        source: ragResult.source || 'rag',
        rag_hits: ragResult.rag_hits || [],
        traces,
      });
    }

    if (ragResult.error && effectivePatientId && effectivePatientId !== 'all-patients') {
      const analysis = await runAnalysisAgent(contextualMessage, effectivePatientId, apiKey, model, (trace) => traces.push(trace));
      return res.json({
        ...analysis,
        response: analysis.answer || analysis.response || analysis.summary || 'No AI response returned.',
        traces,
        fallback: 'analysis-agent',
      });
    }

    return res.status(404).json({
      error: ragResult.error || 'No patient context available for this query',
      source: 'rag',
      traces,
    });
  } catch (error) {
    if (effectivePatientId && effectivePatientId !== 'all-patients') {
      try {
        const fallback = await runAnalysisAgent(contextualMessage, effectivePatientId, apiKey, model, (trace) => traces.push(trace));
        return res.status(200).json({
          ...fallback,
          response: fallback.answer || fallback.response || fallback.summary || 'No AI response returned.',
          traces,
          fallback: 'analysis-agent',
        });
      } catch (fallbackError) {
        return res.status(500).json({ error: fallbackError.message || 'Assistant query failed' });
      }
    }
    return res.status(500).json({ error: error.message || 'Assistant query failed' });
  }
});

router.post('/summary', async (req, res) => {
  const patientId = resolvePatientId(req.body?.patientId);
  if (!patientId) {
    return res.status(400).json({ error: 'patientId is required' });
  }

  try {
    const ragSummary = await runRagPatientSummary(patientId, req.body?.apiKey, req.body?.model);
    if (!ragSummary.error && Array.isArray(ragSummary.summary_points) && ragSummary.summary_points.length > 0) {
      return res.json({ patientId, ...ragSummary, source: ragSummary.source || 'rag' });
    }

    const bundle = await getPatientBundle(patientId);
    if (!bundle) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    return res.json({
      patientId,
      source: 'repository',
      fallback: true,
      summary_points: buildFallbackSummary(bundle),
      patient: bundle.patient,
    });
  } catch (error) {
    try {
      const bundle = await getPatientBundle(patientId);
      if (!bundle) {
        return res.status(500).json({ error: error.message || 'Summary generation failed' });
      }
      return res.json({
        patientId,
        source: 'repository',
        fallback: true,
        summary_points: buildFallbackSummary(bundle),
        patient: bundle.patient,
      });
    } catch {
      return res.status(500).json({ error: error.message || 'Summary generation failed' });
    }
  }
});

router.post('/rag-query', async (req, res) => {
  const { patientId, query, apiKey, model } = req.body || {};
  const message = String(query || '').trim();
  if (!patientId || !message) {
    return res.status(400).json({ error: 'patientId and query are required' });
  }

  try {
    const result = await runRagDoctorQuery(patientId, message, apiKey, model);
    if (result.error) {
      return res.status(404).json(result);
    }
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'RAG query failed' });
  }
});

router.post('/second-opinion', async (req, res) => {
  const patientId = resolvePatientId(req.body?.patientId);
  const proposedDiagnosis = String(req.body?.proposedDiagnosis || '').trim();
  if (!patientId || !proposedDiagnosis) {
    return res.status(400).json({ error: 'patientId and proposedDiagnosis are required' });
  }

  blockchain.addBlock('SECOND_OPINION_REQUEST', req.headers['x-actor-id'] || 'SYSTEM', patientId, `Second opinion: ${proposedDiagnosis}`);

  try {
    const result = await runSecondOpinionAgent(patientId, proposedDiagnosis, req.body?.apiKey, req.body?.model);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Second opinion failed' });
  }
});

router.post('/triage', async (req, res) => {
  const patientId = resolvePatientId(req.body?.patientId);
  if (!patientId) {
    return res.status(400).json({ error: 'patientId is required' });
  }

  blockchain.addBlock('TRIAGE_INITIATED', req.headers['x-actor-id'] || 'SYSTEM', patientId, 'Triage agent invoked');

  try {
    const result = await runTriageAgent(patientId, req.body?.apiKey);
    if (result.needs_consultation) {
      blockchain.addBlock('TICKET_RAISED', 'SYSTEM', patientId, `Consultation ticket raised - ${result.priority} priority`);
    }
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Triage failed' });
  }
});

router.post('/receptionist', async (req, res) => {
  const message = String(req.body?.message || '').trim();
  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  try {
    const response = await runReceptionist(message, req.body?.history || [], req.body?.apiKey);
    return res.json({ response });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Receptionist agent failed' });
  }
});

router.post('/nutrition', async (req, res) => {
  const { patientId, foodDescription, apiKey } = req.body || {};
  let conditions = [];

  if (patientId) {
    try {
      const bundle = await getPatientBundle(patientId);
      if (bundle && bundle.patient) {
        conditions = [
          ...(Array.isArray(bundle.patient.diagnosis) ? bundle.patient.diagnosis : []),
          ...(Array.isArray(bundle.patient.primaryDiagnosis) ? bundle.patient.primaryDiagnosis : []),
          ...(Array.isArray(bundle.patient.secondaryDiagnosis) ? bundle.patient.secondaryDiagnosis : []),
        ].filter(Boolean);
      }
    } catch {
      conditions = [];
    }
  }

  const description = String(foodDescription || '').trim() || (conditions.length
    ? `Give nutrition advice for conditions: ${conditions.join(', ')}`
    : 'Give a balanced diet recommendation for a general adult patient.');

  try {
    const result = await runNutritionAgent(description, conditions, apiKey);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Nutrition agent failed' });
  }
});

module.exports = router;
