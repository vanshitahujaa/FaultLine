/**
 * FaultLine Backend Server
 * Main entry point for the Express API
 */

require('dotenv').config();
const app = require('./app');
const logger = require('./utils/logger');
const persistenceService = require('./services/persistence.service');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

async function startServer() {
  try {
    // Initialize persistence
    await persistenceService.initialize();
    
    const server = app.listen(PORT, HOST, () => {
      logger.info(`🚀 FaultLine backend running at http://${HOST}:${PORT}`);
      logger.info('📊 Available endpoints:');
      logger.info('  POST   /api/deploy - Deploy a container');
      logger.info('  GET    /api/containers - List all containers');
      logger.info('  GET    /api/health/:containerName - Check container health');
      logger.info('  GET    /api/logs/:containerName - Get container logs');
      logger.info('  POST   /api/failures/kill - Inject kill failure');
      logger.info('  POST   /api/failures/latency - Inject latency failure');
      logger.info('  GET    /api/timeline/:containerName - Get recovery timeline');
      logger.info('  GET    /api/timelines - Get all timelines');
      logger.info('  GET    /ping - Health check');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully...');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Unhandled promise rejection
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Unhandled exception
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});
