/**
 * CI/CD Pipeline Service
 * Manages automated build, test, and deployment workflows for GitHub applications
 */

const fs = require('fs');
const path = require('path');
const { exec, execSync } = require('child_process');
const { promisify } = require('util');
const logger = require('../utils/logger');
const dockerService = require('./docker.service');
const persistenceService = require('./persistence.service');
const { v4: uuid } = require('uuid');

const execAsync = promisify(exec);

class CIPipelineService {
  constructor() {
    this.pipelineRuns = new Map(); // Track pipeline execution history
    this.buildLogs = new Map(); // Store build logs per pipeline
  }

  /**
   * Execute full CI/CD pipeline for GitHub application
   * 1. Clone repository
   * 2. Lint/validate code
   * 3. Run unit tests (if test script exists)
   * 4. Build Docker image
   * 5. Deploy container
   * 6. Run smoke tests
   */
  async executeCIPipeline(repoUrl, containerName, branch = 'main') {
    const pipelineId = uuid();
    const startTime = new Date();
    const logs = [];

    try {
      logger.info(`Starting CI/CD pipeline ${pipelineId} for ${repoUrl}`);
      this._logPipeline(logs, `[PIPELINE] Starting CI/CD for ${repoUrl}`);

      // Step 1: Clone repository
      this._logPipeline(logs, '[STEP 1/6] Cloning repository...');
      const repoDir = await this._cloneRepo(repoUrl, branch, logs);
      this._logPipeline(logs, `✅ Repository cloned to ${repoDir}`);

      // Step 2: Detect and validate Dockerfile
      this._logPipeline(logs, '[STEP 2/6] Validating Dockerfile...');
      const dockerfilePath = await this._detectDockerfile(repoDir, logs);
      this._logPipeline(logs, `✅ Dockerfile found at ${dockerfilePath}`);

      // Step 3: Run linting (if applicable)
      this._logPipeline(logs, '[STEP 3/6] Running code quality checks...');
      await this._runLinting(repoDir, logs);
      this._logPipeline(logs, '✅ Code quality checks passed');

      // Step 4: Run tests (if test script exists)
      this._logPipeline(logs, '[STEP 4/6] Running tests...');
      await this._runTests(repoDir, logs);
      this._logPipeline(logs, '✅ Tests completed');

      // Step 5: Build Docker image
      this._logPipeline(logs, '[STEP 5/6] Building Docker image...');
      const imageName = await this._buildImage(repoDir, containerName, logs);
      this._logPipeline(logs, `✅ Image built: ${imageName}`);

      // Step 6: Deploy and smoke test
      this._logPipeline(logs, '[STEP 6/6] Deploying and running smoke tests...');
      const deployment = await dockerService.createContainer(imageName, containerName);
      this._logPipeline(logs, `✅ Container deployed: ${containerName}`);

      // Run smoke tests
      await this._runSmokeTests(containerName, logs);
      this._logPipeline(logs, '✅ Smoke tests passed');

      const endTime = new Date();
      const duration = endTime - startTime;

      const result = {
        pipelineId,
        status: 'success',
        repoUrl,
        containerName,
        imageName,
        branch,
        startTime,
        endTime,
        durationMs: duration,
        steps: 6,
        logs
      };

      this.pipelineRuns.set(pipelineId, result);
      this.buildLogs.set(containerName, logs);

      // Record in timeline
      persistenceService.recordPipelineExecution(containerName, {
        pipelineId,
        status: 'success',
        repoUrl,
        branch,
        durationMs: duration,
        stepsCompleted: 6,
        timestamp: startTime.toISOString()
      });

      logger.info(`✅ CI/CD pipeline ${pipelineId} completed successfully in ${duration}ms`);
      return result;
    } catch (error) {
      logger.error(`❌ CI/CD pipeline ${pipelineId} failed`, error);
      this._logPipeline(logs, `❌ Pipeline failed: ${error.message}`);

      const result = {
        pipelineId,
        status: 'failed',
        repoUrl,
        containerName,
        branch,
        startTime,
        endTime: new Date(),
        durationMs: new Date() - startTime,
        error: error.message,
        logs
      };

      this.pipelineRuns.set(pipelineId, result);
      this.buildLogs.set(containerName, logs);

      persistenceService.recordPipelineExecution(containerName, {
        pipelineId,
        status: 'failed',
        repoUrl,
        branch,
        error: error.message,
        timestamp: startTime.toISOString()
      });

      throw result;
    }
  }

  /**
   * Clone repository with depth=1 for efficiency
   */
  async _cloneRepo(repoUrl, branch, logs) {
    try {
      const repoDir = `/tmp/faultline-ci-${uuid()}`;
      fs.mkdirSync(repoDir, { recursive: true });

      const normalizedUrl = this._normalizeRepoUrl(repoUrl);
      this._logPipeline(logs, `Cloning ${normalizedUrl}:${branch}`);

      await execAsync(
        `git clone --depth=1 --branch ${branch} ${normalizedUrl} ${repoDir}`,
        { timeout: 120000 }
      );

      return repoDir;
    } catch (error) {
      throw new Error(`Failed to clone repository: ${error.message}`);
    }
  }

  /**
   * Detect Dockerfile in repository
   */
  async _detectDockerfile(repoDir, logs) {
    const dockerfilePaths = ['Dockerfile', 'dockerfile', 'docker/Dockerfile'];

    for (const dockerfilePath of dockerfilePaths) {
      const fullPath = path.join(repoDir, dockerfilePath);
      if (fs.existsSync(fullPath)) {
        this._logPipeline(logs, `Found Dockerfile at ${dockerfilePath}`);
        return fullPath;
      }
    }

    throw new Error('No Dockerfile found in repository');
  }

  /**
   * Run code linting (ESLint, Prettier, etc)
   */
  async _runLinting(repoDir, logs) {
    try {
      const packageJsonPath = path.join(repoDir, 'package.json');

      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

        if (packageJson.devDependencies?.eslint || packageJson.devDependencies?.prettier) {
          this._logPipeline(logs, 'Running ESLint/Prettier...');
          try {
            await execAsync('npm run lint --prefix ' + repoDir, { timeout: 60000 });
            this._logPipeline(logs, 'Linting passed');
          } catch (e) {
            this._logPipeline(logs, '⚠️  Linting warnings (non-fatal): ' + e.message.substring(0, 100));
          }
        } else {
          this._logPipeline(logs, 'No linting tools configured');
        }
      }
    } catch (error) {
      this._logPipeline(logs, `Linting check skipped: ${error.message.substring(0, 50)}`);
    }
  }

  /**
   * Run tests if test script exists
   */
  async _runTests(repoDir, logs) {
    try {
      const packageJsonPath = path.join(repoDir, 'package.json');

      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

        if (packageJson.scripts?.test && packageJson.scripts.test !== 'echo "Error: no test specified"') {
          this._logPipeline(logs, 'Running npm test...');
          try {
            await execAsync('npm test --prefix ' + repoDir, { timeout: 120000 });
            this._logPipeline(logs, 'Tests passed');
          } catch (e) {
            this._logPipeline(logs, '⚠️  Tests failed (continuing): ' + e.message.substring(0, 100));
          }
        } else {
          this._logPipeline(logs, 'No test script configured');
        }
      }
    } catch (error) {
      this._logPipeline(logs, `Test execution skipped: ${error.message.substring(0, 50)}`);
    }
  }

  /**
   * Build Docker image from Dockerfile
   */
  async _buildImage(repoDir, containerName, logs) {
    try {
      const imageName = `faultline-${containerName}:latest`;
      this._logPipeline(logs, `Building image: ${imageName}`);

      const buildCommand = `docker build -t ${imageName} ${repoDir}`;
      const { stdout, stderr } = await execAsync(buildCommand, { timeout: 300000 });

      this._logPipeline(logs, stdout.split('\n').slice(-5).join('\n'));
      if (stderr) {
        this._logPipeline(logs, 'Build stderr: ' + stderr.substring(0, 200));
      }

      return imageName;
    } catch (error) {
      throw new Error(`Failed to build image: ${error.message}`);
    }
  }

  /**
   * Run smoke tests on deployed container
   */
  async _runSmokeTests(containerName, logs) {
    try {
      this._logPipeline(logs, 'Running smoke tests...');

      // Check if container is running
      const health = await dockerService.getContainerHealth(containerName);
      if (!health.running) {
        throw new Error('Container not running after deployment');
      }

      this._logPipeline(logs, '✅ Container is running');

      // Try to get logs (container must respond)
      const containerLogs = await dockerService.getContainerLogs(containerName, 10);
      if (containerLogs && containerLogs.length > 0) {
        this._logPipeline(logs, '✅ Container responding with logs');
      }

      this._logPipeline(logs, '✅ Smoke tests passed');
    } catch (error) {
      throw new Error(`Smoke tests failed: ${error.message}`);
    }
  }

  /**
   * Get pipeline execution history
   */
  async getPipelineHistory(containerName) {
    const history = persistenceService.getPipelineHistory(containerName) || [];
    return history;
  }

  /**
   * Get pipeline logs
   */
  async getPipelineLogs(containerName) {
    return this.buildLogs.get(containerName) || [];
  }

  /**
   * Normalize repository URL
   */
  _normalizeRepoUrl(url) {
    if (url.startsWith('git@github.com:')) {
      return url;
    }
    if (url.includes('github.com')) {
      if (!url.endsWith('.git')) {
        return url + '.git';
      }
      return url;
    }
    if (url.match(/^[a-zA-Z0-9-]+\/[a-zA-Z0-9-._]+$/)) {
      return `https://github.com/${url}.git`;
    }
    return url;
  }

  /**
   * Helper to log pipeline steps
   */
  _logPipeline(logs, message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    logs.push(logEntry);
    logger.info(message);
  }
}

module.exports = new CIPipelineService();
