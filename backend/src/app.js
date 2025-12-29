/**
 * Express app setup and middleware configuration
 */

const express = require('express');
const cors = require('cors');
const logger = require('./utils/logger');
const deployRoutes = require('./routes/deploy.routes');

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'FaultLine',
    version: '1.0.0',
    description: 'Chaos Engineering Platform for Docker',
    status: 'running',
    api: '/api',
    endpoints: {
      health: '/ping',
      deploy: 'POST /api/deploy',
      containers: 'GET /api/containers',
      health_check: 'GET /api/health/:containerName',
      logs: 'GET /api/logs/:containerName',
      failures: 'GET /api/failures/:containerName',
      timelines: 'GET /api/timelines/:containerName'
    }
  });
});

// Routes
app.use('/api', deployRoutes);

// Health check endpoint
app.get('/ping', (req, res) => {
  res.json({ status: 'ok', message: 'FaultLine backend is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', err);
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path
  });
});

module.exports = app;
