/**
 * Deployment routes
 * Handles container deployment, monitoring, and failure injection
 */

const express = require('express');
const router = express.Router();
const dockerService = require('../services/docker.service');
const failureService = require('../services/failure.service');
const githubService = require('../services/github.service');
const logger = require('../utils/logger');

/**
 * Deploy a new container
 * POST /deploy
 * Body: { image, containerName }
 */
router.post('/deploy', async (req, res) => {
  try {
    const { image, containerName } = req.body;

    if (!image || !containerName) {
      return res.status(400).json({
        error: 'Missing required fields: image, containerName'
      });
    }

    // Check if container already exists
    const existingContainer = await dockerService.getContainerByName(containerName);
    if (existingContainer) {
      return res.status(409).json({
        error: 'Container name already exists',
        container: containerName,
        message: `A container named "${containerName}" is already running or exists`
      });
    }

    // Pull image first
    await dockerService.pullImage(image);

    // Create and start container
    const container = await dockerService.createContainer(image, containerName);

    res.status(201).json({
      success: true,
      message: `Container ${containerName} deployed successfully`,
      container: {
        id: container.id,
        name: containerName,
        image: image
      }
    });
  } catch (error) {
    logger.error('Deployment failed', error);
    res.status(500).json({
      error: 'Deployment failed',
      details: error.message
    });
  }
});

/**
 * Get container health
 * GET /health/:containerName
 */
router.get('/health/:containerName', async (req, res) => {
  try {
    const { containerName } = req.params;
    const health = await dockerService.getContainerHealth(containerName);

    res.json({
      success: true,
      health
    });
  } catch (error) {
    logger.error('Health check failed', error);
    res.status(500).json({
      error: 'Health check failed',
      details: error.message
    });
  }
});

/**
 * Get container logs
 * GET /logs/:containerName
 */
router.get('/logs/:containerName', async (req, res) => {
  try {
    const { containerName } = req.params;
    const tail = req.query.tail || 100;
    const logs = await dockerService.getContainerLogs(containerName, tail);

    res.json({
      success: true,
      container: containerName,
      logs
    });
  } catch (error) {
    logger.error('Failed to get logs', error);
    res.status(500).json({
      error: 'Failed to retrieve logs',
      details: error.message
    });
  }
});

/**
 * List all containers
 * GET /containers
 */
router.get('/containers', async (req, res) => {
  try {
    const containers = await dockerService.listContainers();

    res.json({
      success: true,
      containers,
      count: containers.length
    });
  } catch (error) {
    logger.error('Failed to list containers', error);
    res.status(500).json({
      error: 'Failed to list containers',
      details: error.message
    });
  }
});

/**
 * Inject kill failure
 * POST /failures/kill
 * Body: { containerName, delay }
 */
router.post('/failures/kill', async (req, res) => {
  try {
    const { containerName, delay = 0 } = req.body;

    if (!containerName) {
      return res.status(400).json({
        error: 'Missing required field: containerName'
      });
    }

    const result = await failureService.injectKillFailure(containerName, delay);

    res.status(202).json(result);
  } catch (error) {
    logger.error('Failed to inject kill failure', error);
    res.status(500).json({
      error: 'Failed to inject failure',
      details: error.message
    });
  }
});

/**
 * Inject latency failure
 * POST /failures/latency
 * Body: { containerName, latencyMs, duration }
 */
router.post('/failures/latency', async (req, res) => {
  try {
    const { containerName, latencyMs = 1000, duration = 60000 } = req.body;

    if (!containerName) {
      return res.status(400).json({
        error: 'Missing required field: containerName'
      });
    }

    const result = await failureService.injectLatencyFailure(containerName, latencyMs, duration);

    res.status(202).json(result);
  } catch (error) {
    logger.error('Failed to inject latency failure', error);
    res.status(500).json({
      error: 'Failed to inject failure',
      details: error.message
    });
  }
});

/**
 * Get recovery timeline
 * GET /timeline/:containerName
 */
router.get('/timeline/:containerName', async (req, res) => {
  try {
    const { containerName } = req.params;
    const timeline = await failureService.getRecoveryTimeline(containerName);

    res.json({
      success: true,
      timeline
    });
  } catch (error) {
    logger.error('Failed to get timeline', error);
    res.status(500).json({
      error: 'Failed to retrieve timeline',
      details: error.message
    });
  }
});

/**
 * Get all timelines
 * GET /timelines
 */
router.get('/timelines', async (req, res) => {
  try {
    const timelines = await failureService.getAllTimelines();

    res.json({
      success: true,
      timelines
    });
  } catch (error) {
    logger.error('Failed to get timelines', error);
    res.status(500).json({
      error: 'Failed to retrieve timelines',
      details: error.message
    });
  }
});

/**
 * Deploy from GitHub repository
 * POST /deploy-from-github
 * Body: { repoUrl, containerName, branch }
 * 
 * Workflow: Clone → Detect Dockerfile → Build Image → Create Container
 */
router.post('/deploy-from-github', async (req, res) => {
  try {
    const { repoUrl, containerName, branch = 'main' } = req.body;

    if (!repoUrl || !containerName) {
      return res.status(400).json({
        error: 'Missing required fields: repoUrl, containerName'
      });
    }

    // Check if container already exists
    const existingContainer = await dockerService.getContainerByName(containerName);
    if (existingContainer) {
      return res.status(409).json({
        error: 'Container name already exists',
        container: containerName,
        message: `A container named "${containerName}" is already running or exists`
      });
    }

    // Step 1: Deploy from GitHub (clone + build)
    res.status(202).json({
      status: 'processing',
      message: 'Starting GitHub deployment workflow...',
      steps: ['cloning', 'detecting', 'building', 'deploying']
    });

    // Process in background (don't wait for build)
    (async () => {
      try {
        logger.info(`Starting GitHub deployment: ${repoUrl} → ${containerName}`);

        // Deploy from GitHub
        const githubResult = await githubService.deployFromGitHub(repoUrl, containerName, branch);

        // Create and start container from built image
        logger.info(`Creating container from built image: ${githubResult.imageName}`);
        const container = await dockerService.createContainer(githubResult.imageName, containerName);

        logger.info(`Container ${containerName} deployed successfully from GitHub`);
        
        // Record in timeline
        await failureService.recordGitHubDeployment(containerName, {
          repoUrl,
          branch,
          imageName: githubResult.imageName,
          deploymentTime: new Date(),
          buildLog: githubResult.buildLog
        });

      } catch (error) {
        logger.error(`GitHub deployment failed for ${containerName}`, error);
        // Could send webhook/notification here for real-time feedback
      }
    })();

  } catch (error) {
    logger.error('GitHub deployment request failed', error);
    res.status(500).json({
      error: 'GitHub deployment failed',
      details: error.message
    });
  }
});

module.exports = router;
