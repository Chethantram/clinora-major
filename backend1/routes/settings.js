const express = require('express');
const { getUserSettings, updateUserSettings } = require('../services/authService');

const router = express.Router();
const PREFERENCE_KEYS = {
  notifications: ['critical', 'lab', 'drug', 'email'],
  assistant: ['briefs', 'trends', 'guidelines', 'interactions'],
};

function validateSettings(body = {}) {
  const profile = body.profile || {};
  const preferences = body.preferences || {};
  const normalizedProfile = {
    name: String(profile.name || '').trim(),
    phone: String(profile.phone || '').trim(),
    department: String(profile.department || '').trim(),
  };

  if (!normalizedProfile.name || normalizedProfile.name.length > 120) {
    return { error: 'Name is required and must be 120 characters or fewer' };
  }
  if (normalizedProfile.phone.length > 32) return { error: 'Phone must be 32 characters or fewer' };
  if (normalizedProfile.department.length > 120) return { error: 'Department must be 120 characters or fewer' };

  for (const [group, keys] of Object.entries(PREFERENCE_KEYS)) {
    if (!preferences[group] || keys.some((key) => typeof preferences[group][key] !== 'boolean')) {
      return { error: `All ${group} preferences must be provided as true or false` };
    }
  }

  return {
    profile: normalizedProfile,
    preferences: {
      notifications: Object.fromEntries(PREFERENCE_KEYS.notifications.map((key) => [key, preferences.notifications[key]])),
      assistant: Object.fromEntries(PREFERENCE_KEYS.assistant.map((key) => [key, preferences.assistant[key]])),
    },
  };
}

router.get('/', async (req, res) => {
  try {
    const settings = await getUserSettings(req.user.id);
    if (!settings) return res.status(404).json({ error: 'Clinician account not found' });
    return res.json({ ...settings, system: { api: 'connected', database: 'connected' } });
  } catch (error) {
    console.error('Settings request failed:', error.message);
    return res.status(503).json({ error: 'Settings are temporarily unavailable' });
  }
});

router.put('/', async (req, res) => {
  const result = validateSettings(req.body);
  if (result.error) return res.status(400).json({ error: result.error });

  try {
    const settings = await updateUserSettings(req.user.id, result);
    if (!settings) return res.status(404).json({ error: 'Clinician account not found' });
    return res.json(settings);
  } catch (error) {
    console.error('Settings update failed:', error.message);
    return res.status(503).json({ error: 'Settings could not be saved. Please try again.' });
  }
});

module.exports = router;