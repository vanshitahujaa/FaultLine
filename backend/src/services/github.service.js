/**
 * GitHub Service
 * Handles cloning repositories, detecting Dockerfiles, and building images
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const simpleGit = require('simple-git');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const execAsync = promisify(exec);

class GitHubService {
  constructor() {
    this.repoBaseDir = '/tmp/faultline-repos';
    this.ensureRepoDir();
  }

  /**
   * Ensure base directory exists
   */
  ensureRepoDir() {
    if (!fs.existsSync(this.repoBaseDir)) {
      fs.mkdirSync(this.repoBaseDir, { recursive: true });
      logger.info(`Created repo directory: ${this.repoBaseDir}`);
    }
  }

  /**
   * Normalize GitHub URL
   * Supports: user/repo, github.com/user/repo, https://github.com/user/repo, etc.
   */
  normalizeRepoUrl(repoInput) {
    let url = repoInput.trim();
    
    // If it's just user/repo format
    if (!url.includes('://') && !url.includes('github.com')) {
      return `https://github.com/${url}.git`;
    }
    
    // If it's github.com/user/repo format
    if (!url.includes('://')) {
      return `https://${url}.git`;
    }
    
    // If it already has git extension
    if (url.endsWith('.git')) {
      return url;
    }
    
    // Otherwise add .git
    return `${url}.git`;
  }

  /**
   * Clone GitHub repository
   */
  async cloneRepository(repoUrl, branch = 'main') {
    try {
      const repoId = uuidv4().substring(0, 8);
      const repoPath = path.join(this.repoBaseDir, repoId);
      const normalizedUrl = this.normalizeRepoUrl(repoUrl);

      logger.info(`Cloning repository: ${normalizedUrl} (branch: ${branch})`);

      const git = simpleGit();
      await git.clone(normalizedUrl, repoPath, ['--branch', branch, '--depth', '1']);

      logger.info(`Repository cloned successfully to ${repoPath}`);
      return { repoPath, repoId, url: normalizedUrl };
    } catch (error) {
      logger.error(`Failed to clone repository: ${repoUrl}`, error);
      throw new Error(`Failed to clone repository: ${error.message}`);
    }
  }

  /**
   * Check if Dockerfile exists in repository
   */
  async checkDockerfile(repoPath) {
    try {
      const dockerfilePath = path.join(repoPath, 'Dockerfile');
      const dockerfileLowerPath = path.join(repoPath, 'dockerfile');

      if (fs.existsSync(dockerfilePath)) {
        logger.info(`Found Dockerfile at ${dockerfilePath}`);
        return { exists: true, path: dockerfilePath, name: 'Dockerfile' };
      }

      if (fs.existsSync(dockerfileLowerPath)) {
        logger.info(`Found dockerfile at ${dockerfileLowerPath}`);
        return { exists: true, path: dockerfileLowerPath, name: 'dockerfile' };
      }

      logger.warn(`No Dockerfile found in ${repoPath}`);
      return { exists: false, path: null };
    } catch (error) {
      logger.error('Error checking for Dockerfile', error);
      throw error;
    }
  }

  /**
   * Build Docker image from repository
   */
  async buildImage(repoPath, imageName, imageTag = 'latest') {
    try {
      const fullImageName = `${imageName}:${imageTag}`;
      logger.info(`Building Docker image: ${fullImageName}`);

      // Build the image
      const buildCommand = `cd "${repoPath}" && docker build -t ${fullImageName} .`;
      const { stdout, stderr } = await execAsync(buildCommand, { 
        timeout: 300000 // 5 minute timeout
      });

      logger.info(`Image built successfully: ${fullImageName}`);
      logger.info(`Build output: ${stdout}`);

      return {
        success: true,
        imageName,
        imageTag,
        fullImageName,
        buildLog: stdout + stderr
      };
    } catch (error) {
      logger.error(`Failed to build Docker image`, error);
      throw new Error(`Failed to build Docker image: ${error.message}`);
    }
  }

  /**
   * Complete workflow: clone → detect → build
   */
  async deployFromGitHub(repoUrl, containerName, branch = 'main') {
    let repoPath = null;
    let repoId = null;

    try {
      // Step 1: Clone repository
      logger.info(`Step 1: Cloning ${repoUrl}...`);
      const cloneResult = await this.cloneRepository(repoUrl, branch);
      repoPath = cloneResult.repoPath;
      repoId = cloneResult.repoId;

      // Step 2: Check for Dockerfile
      logger.info(`Step 2: Checking for Dockerfile...`);
      const dockerfileCheck = await this.checkDockerfile(repoPath);
      if (!dockerfileCheck.exists) {
        throw new Error('No Dockerfile found in repository');
      }

      // Step 3: Build image
      logger.info(`Step 3: Building Docker image...`);
      const imageName = `faultline-${containerName}`;
      const buildResult = await this.buildImage(repoPath, imageName, 'latest');

      logger.info(`Deployment from GitHub completed successfully`);

      return {
        success: true,
        imageName: buildResult.fullImageName,
        containerName,
        repoUrl,
        branch,
        repoId,
        message: `Successfully built image from ${repoUrl}`,
        buildLog: buildResult.buildLog
      };
    } catch (error) {
      logger.error('GitHub deployment failed', error);
      throw error;
    } finally {
      // Optional: Clean up after build (keep for debugging, comment out for production)
      // if (repoPath && fs.existsSync(repoPath)) {
      //   fs.rmSync(repoPath, { recursive: true, force: true });
      //   logger.info(`Cleaned up repository: ${repoPath}`);
      // }
    }
  }

  /**
   * Extract repository name from URL
   */
  extractRepoName(repoUrl) {
    const normalized = this.normalizeRepoUrl(repoUrl);
    const match = normalized.match(/\/([^\/]+?)(?:\.git)?$/);
    return match ? match[1] : 'unknown-repo';
  }
}

module.exports = new GitHubService();
