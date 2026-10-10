require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const routes = require('./routes/index');
const dashboardRoutes = require('./routes/dashboard');
const patientRoutes = require('./routes/patients');
const assistantRoutes = require('./routes/assistant');
const alertsRoutes = require('./routes/alerts');
const labRoutes = require('./routes/labs');
const medicationRoutes = require('./routes/medications');
const reportRoutes = require('./routes/reports');
const settingsRoutes = require('./routes/settings');
const authRoutes = require('./routes/auth');
const whatsappRoute = require('./routes/whatsapp');
const { requireSession } = require('./services/authService');

function createApp(io) {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  };
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use((req, res, next) => {
    req.io = io || null;
    next();
  });

  app.use('/api/whatsapp', whatsappRoute);
  app.use('/api/auth', authRoutes);
  app.use('/api', requireSession());
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/patients', patientRoutes);
  app.use('/api/alerts', alertsRoutes);
  app.use('/api/labs', labRoutes);
  app.use('/api/medications', medicationRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/assistant', assistantRoutes);
  app.use('/api/agent', assistantRoutes);
  app.use('/api', routes);

  app.get('/', (req, res) =>
    res.json({
      status: 'Patient Intelligence Backend Running',
      hospital: 'Kathir Memorial Hospital',
    })
  );

  return app;
}

module.exports = { createApp };
