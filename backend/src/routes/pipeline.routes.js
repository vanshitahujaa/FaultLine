/**
 * CI/CD Pipeline & Recovery Routes
 * Handles endpoints for CI/CD execution and recovery management
 */

const express = require('express');
const logger = require('../utils/logger');
const ciPipeline = require('../services/cipeline.service');
const recovery = require('../services/recovery.service');
const dockerService = require('../services/docker.service');

const router = express.Router();

/**
 * Execute CI/CD pipeline for GitHub application
 * POST /pipeline/execute
 * Body: { repoUrl, containerName, branch }
 */
router.post('/pipeline/execute', async (req, res) => {
  try {
    const { repoUrl, containerName, branch = 'main' } = req.body;

    if (!repoUrl || !containerName) {
      return res.status(400).json({
        error: 'Missing required fields: repoUrl, containerName'
      });
    }

    // Start pipeline execution in background
    const startTime = new Date();
    res.status(202).json({
      message: 'CI/CD pipeline started',
      containerName,
      repoUrl,
      branch,
      estimatedDuration: '2-5 minutes'
    });

    // Execute asynchronously
    ciPipeline
      .executeCIPipeline(repoUrl, containerName, branch)
      .then(result => {
        logger.info(`Pipeline ${result.pipelineId} completed successfully`);
      })
      .catch(error => {
        logger.error('Pipeline execution failed', error);
      });
  } catch (error) {
    logger.error('Failed to start CI/CD pipeline', error);
    res.status(500).json({
      error: 'Failed to start pipeline',
      details: error.message
    });
  }
});

/**
 * Get pipeline logs for a container
 * GET /pipeline/logs/:containerName
 */
router.get('/pipeline/logs/:containerName', async (req, res) => {
  try {
    const { containerName } = req.params;
    const logs = await ciPipeline.getPipelineLogs(containerName);

    res.json({
      success: true,
      containerName,
      logs,
      logCount: logs.length
    });
  } catch (error) {
    logger.error('Failed to get pipeline logs', error);
    res.status(500).json({
      error: 'Failed to retrieve pipeline logs',
      details: error.message
    });
  }
});

/**
 * Get pipeline execution history
 * GET /pipeline/history/:containerName
 */
router.get('/pipeline/history/:containerName', async (req, res) => {
  try {
    const { containerName } = req.params;
    const history = await ciPipeline.getPipelineHistory(containerName);

    res.json({
      success: true,
      containerName,
      executions: history,
      totalExecutions: history.length
    });
  } catch (error) {
    logger.error('Failed to get pipeline history', error);
    res.status(500).json({
      error: 'Failed to retrieve pipeline history',
      details: error.message
    });
  }
});

/**
 * Start auto-recovery for a container
 * POST /recovery/start
 * Body: { containerName, strategy, options }
 */
router.post('/recovery/start', async (req, res) => {
  try {
    const { containerName, strategy = 'restart', options = {} } = req.body;

    if (!containerName) {
      return res.status(400).json({
        error: 'Missing required field: containerName'
      });
    }

    // Register policy
    recovery.registerRecoveryPolicy(containerName, {
      strategy,
      ...options
    });

    // Start auto-recovery
    await recovery.startAutoRecovery(containerName, { recoveryStrategy: strategy, ...options });

    res.json({
      success: true,
      message: `Auto-recovery started for ${containerName}`,
      containerName,
      strategy,
      options
    });
  } catch (error) {
    logger.error('Failed to start auto-recovery', error);
    res.status(500).json({
      error: 'Failed to start auto-recovery',
      details: error.message
    });
  }
});

/**
 * Stop auto-recovery for a container
 * POST /recovery/stop/:containerName
 */
router.post('/recovery/stop/:containerName', async (req, res) => {
  try {
    const { containerName } = req.params;

    recovery.stopAutoRecovery(containerName);

    res.json({
      success: true,
      message: `Auto-recovery stopped for ${containerName}`
    });
  } catch (error) {
    logger.error('Failed to stop auto-recovery', error);
    res.status(500).json({
      error: 'Failed to stop auto-recovery',
      details: error.message
    });
  }
});

/**
 * Get recovery metrics for a container
 * GET /recovery/metrics/:containerName
 */
router.get('/recovery/metrics/:containerName', async (req, res) => {
  try {
    const { containerName } = req.params;
    const metrics = recovery.calculateSLIMetrics(containerName);

    res.json({
      success: true,
      containerName,
      metrics,
      report: recovery.generateRecoveryReport(containerName)
    });
  } catch (error) {
    logger.error('Failed to get recovery metrics', error);
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      details: error.message
    });
  }
});

/**
 * Get active recovery processes
 * GET /recovery/active
 */
router.get('/recovery/active', async (req, res) => {
  try {
    const active = recovery.getActiveRecoveryProcesses();

    res.json({
      success: true,
      activeRecoveries: active,
      count: active.length
    });
  } catch (error) {
    logger.error('Failed to get active recoveries', error);
    res.status(500).json({
      error: 'Failed to retrieve active recoveries',
      details: error.message
    });
  }
});

/**
 * Get recovery history for a container
 * GET /recovery/history/:containerName
 */
router.get('/recovery/history/:containerName', async (req, res) => {
  try {
    const { containerName } = req.params;
    const history = await recovery.getRecoveryHistory(containerName);

    res.json({
      success: true,
      containerName,
      recoveryEvents: history,
      totalEvents: history.length
    });
  } catch (error) {
    logger.error('Failed to get recovery history', error);
    res.status(500).json({
      error: 'Failed to retrieve recovery history',
      details: error.message
    });
  }
});

/**
 * Generate comprehensive monitoring report
 * GET /report/monitoring/:containerName
 */
router.get('/report/monitoring/:containerName', async (req, res) => {
  try {
    const { containerName } = req.params;

    // Get container health
    const health = await dockerService.getContainerHealth(containerName);

    // Get recovery metrics
    const recoveryMetrics = recovery.calculateSLIMetrics(containerName);

    // Get pipeline history
    const pipelineHistory = await ciPipeline.getPipelineHistory(containerName);

    // Get recovery history
    const recoveryHistory = await recovery.getRecoveryHistory(containerName);

    const report = {
      containerName,
      timestamp: new Date().toISOString(),
      health,
      sliMetrics: recoveryMetrics,
      pipelineExecutions: pipelineHistory.length,
      recoveryEvents: recoveryHistory.length,
      summary: {
        status: health.running ? 'running' : 'stopped',
        successRate: recoveryMetrics.successRate,
        avgMTTR: recoveryMetrics.avgMTTRMs + 'ms',
        recommendations: recovery.generateRecoveryReport(containerName).recommendations
      }
    };

    res.json(report);
  } catch (error) {
    logger.error('Failed to generate monitoring report', error);
    res.status(500).json({
      error: 'Failed to generate report',
      details: error.message
    });
  }
});

module.exports = router;
