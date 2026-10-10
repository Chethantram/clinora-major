if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const { createApp } = require('./app');
const blockchain = require('./blockchain/logger');
const { initIndex, indexPatient, indexPatientBundle } = require('./rag/vectorStore');
const { isMongoConfigured } = require('./db/mongo');
const { getPatientBundle, listPatients } = require('./repositories/clinicalRepository');

const ioCors = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST'],
};

// Ensure uploads dir exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

// Init blockchain + RAG
async function init() {
  const app = createApp();
  const server = http.createServer(app);
  const io = new Server(server, { cors: ioCors });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.emit('chain_snapshot', blockchain.getChain());
    socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
  });

  app.use((req, res, next) => {
    req.io = io;
    next();
  });

  blockchain.init(io);
  console.log('Blockchain initialized');

  try {
    await initIndex();
    if (isMongoConfigured()) {
      const patients = await listPatients();
      for (const patient of patients) {
        const bundle = await getPatientBundle(patient.patient_id);
        if (bundle) await indexPatientBundle(bundle);
        console.log(`Indexed patient from Atlas: ${patient.name}`);
      }
    } else {
      const dataDir = path.join(__dirname, 'data');
      const patientFiles = fs.readdirSync(dataDir).filter((f) => /^patient_.*\.json$/i.test(f));
      for (const file of patientFiles) {
        const patient = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
        await indexPatient(patient);
        console.log(`Indexed patient: ${patient.name}`);
      }
    }
    console.log('RAG index ready');
  } catch (e) {
    console.warn('RAG init warning:', e.message);
  }

  const PORT = process.env.PORT || 4000;
  server.listen(PORT, () => {
    console.log(`\nKathir Memorial — Patient Intelligence Backend`);
    console.log(`Running on port ${PORT}`);
    console.log(`Frontend: ${process.env.FRONTEND_URL || 'http://localhost:3000'}\n`);
  });
}

init();
