/**
 * Recovery & Healing Service
 * Automatically detects and repairs failed containers
 * Tracks Mean Time To Recovery (MTTR) and other SLI metrics
 */

const logger = require('../utils/logger');
const dockerService = require('./docker.service');
const persistenceService = require('./persistence.service');

class RecoveryService {
  constructor() {
    this.activeRecoveryProcesses = new Map(); // Track ongoing recoveries
    this.recoveryMetrics = new Map(); // Track recovery metrics per container
    this.recoveryPolicies = new Map(); // Recovery strategies per container
  }

  /**
   * Register recovery policy for a container
   * Options: restart, rebuild, manual
   */
  registerRecoveryPolicy(containerName, policy) {
    this.recoveryPolicies.set(containerName, {
      ...policy,
      createdAt: new Date()
    });
    logger.info(`Recovery policy registered for ${containerName}:`, policy);
  }

  /**
   * Automatic health monitoring and recovery
   * Runs continuously for a container
   */
  async startAutoRecovery(containerName, options = {}) {
    const {
      healthCheckInterval = 5000, // Check every 5 seconds
      recoveryStrategy = 'restart', // 'restart', 'rebuild', 'manual'
      maxRetries = 3,
      retryDelay = 10000
    } = options;

    logger.info(`Starting auto-recovery for ${containerName}`);

    // Don't start duplicate recovery processes
    if (this.activeRecoveryProcesses.has(containerName)) {
      logger.warn(`Auto-recovery already active for ${containerName}`);
      return;
    }

    let retryCount = 0;
    const recoveryStartTime = new Date();

    const monitoringInterval = setInterval(async () => {
      try {
        const health = await dockerService.getContainerHealth(containerName);

        if (!health.running && retryCount < maxRetries) {
          await this._executeRecovery(
            containerName,
            recoveryStrategy,
            health,
            recoveryStartTime
          );
          retryCount++;
        }

        if (health.running && retryCount > 0) {
          // Recovery successful
          const recoveryEndTime = new Date();
          const mttr = recoveryEndTime - recoveryStartTime;

          this._recordRecoveryMetrics(containerName, {
            recovered: true,
            strategy: recoveryStrategy,
            mttrMs: mttr,
            attemptsNeeded: retryCount,
            recoveryDuration: recoveryEndTime.toISOString()
          });

          logger.info(`✅ ${containerName} recovered in ${mttr}ms (${retryCount} attempts)`);
        }

        if (retryCount >= maxRetries && !health.running) {
          clearInterval(monitoringInterval);
          this.activeRecoveryProcesses.delete(containerName);
          logger.error(`❌ ${containerName} recovery failed after ${maxRetries} attempts`);
        }
      } catch (error) {
        logger.error(`Auto-recovery monitor error for ${containerName}`, error);
      }
    }, healthCheckInterval);

    this.activeRecoveryProcesses.set(containerName, {
      interval: monitoringInterval,
      strategy: recoveryStrategy,
      startTime: recoveryStartTime
    });
  }

  /**
   * Stop auto-recovery for a container
   */
  stopAutoRecovery(containerName) {
    if (this.activeRecoveryProcesses.has(containerName)) {
      const { interval } = this.activeRecoveryProcesses.get(containerName);
      clearInterval(interval);
      this.activeRecoveryProcesses.delete(containerName);
      logger.info(`Stopped auto-recovery for ${containerName}`);
    }
  }

  /**
   * Execute recovery strategy
   */
  async _executeRecovery(containerName, strategy, health, recoveryStartTime) {
    try {
      logger.info(`Executing ${strategy} recovery for ${containerName}`);

      switch (strategy) {
        case 'restart':
          await this._restartContainer(containerName);
          break;
        case 'rebuild':
          await this._rebuildContainer(containerName);
          break;
        case 'manual':
          logger.info(`Manual recovery required for ${containerName}`);
          persistenceService.recordRecoveryAttempt(containerName, {
            strategy: 'manual',
            reason: `Container health: ${JSON.stringify(health)}`,
            timestamp: new Date().toISOString(),
            requiresManualIntervention: true
          });
          break;
        default:
          throw new Error(`Unknown recovery strategy: ${strategy}`);
      }
    } catch (error) {
      logger.error(`Recovery execution failed for ${containerName}`, error);
      throw error;
    }
  }

  /**
   * Restart container
   */
  async _restartContainer(containerName) {
    try {
      logger.info(`Restarting container: ${containerName}`);

      // Try graceful stop first
      try {
        const container = await dockerService.getContainerByName(containerName);
        if (container) {
          const data = await container.inspect();
          if (data.State.Running) {
            await container.stop({ t: 10 });
          }
        }
      } catch (e) {
        logger.warn(`Could not gracefully stop ${containerName}`, e.message);
      }

      // Now restart
      const container = await dockerService.getContainerByName(containerName);
      if (container) {
        await container.start();
        logger.info(`✅ Container ${containerName} restarted`);
      }
    } catch (error) {
      throw new Error(`Failed to restart container: ${error.message}`);
    }
  }

  /**
   * Rebuild and redeploy container from last known good image
   */
  async _rebuildContainer(containerName) {
    try {
      logger.info(`Rebuilding container: ${containerName}`);

      // Get container details
      const container = await dockerService.getContainerByName(containerName);
      if (!container) {
        throw new Error(`Container ${containerName} not found`);
      }

      const inspectData = await container.inspect();
      const imageName = inspectData.Config.Image;

      // Remove current container
      try {
        await container.remove({ force: true });
        logger.info(`Removed old container ${containerName}`);
      } catch (e) {
        logger.warn(`Could not remove old container: ${e.message}`);
      }

      // Redeploy from same image
      await dockerService.createContainer(imageName, containerName);
      logger.info(`✅ Container ${containerName} rebuilt from image ${imageName}`);
    } catch (error) {
      throw new Error(`Failed to rebuild container: ${error.message}`);
    }
  }

  /**
   * Record recovery metrics for analytics
   */
  _recordRecoveryMetrics(containerName, metrics) {
    if (!this.recoveryMetrics.has(containerName)) {
      this.recoveryMetrics.set(containerName, []);
    }

    const history = this.recoveryMetrics.get(containerName);
    history.push({
      timestamp: new Date().toISOString(),
      ...metrics
    });

    // Keep only last 100 recoveries per container
    if (history.length > 100) {
      history.shift();
    }

    persistenceService.recordRecoveryMetric(containerName, metrics);

    logger.info(`Recovery metrics recorded for ${containerName}:`, metrics);
  }

  /**
   * Get recovery metrics for a container
   */
  getRecoveryMetrics(containerName) {
    return this.recoveryMetrics.get(containerName) || [];
  }

  /**
   * Calculate SLI metrics (Service Level Indicators)
   */
  calculateSLIMetrics(containerName) {
    const metrics = this.getRecoveryMetrics(containerName);

    if (metrics.length === 0) {
      return {
        totalRecoveries: 0,
        avgMTTR: 0,
        successRate: 100,
        lastRecovery: null
      };
    }

    const successful = metrics.filter(m => m.recovered).length;
    const totalMTTR = metrics.reduce((sum, m) => sum + (m.mttrMs || 0), 0);

    return {
      totalRecoveries: metrics.length,
      successfulRecoveries: successful,
      successRate: (successful / metrics.length * 100).toFixed(2) + '%',
      avgMTTRMs: Math.round(totalMTTR / successful) || 0,
      medianMTTRMs: this._calculateMedian(metrics.map(m => m.mttrMs || 0)),
      lastRecovery: metrics[metrics.length - 1]?.timestamp,
      recentMetrics: metrics.slice(-10)
    };
  }

  /**
   * Get all active recovery processes
   */
  getActiveRecoveryProcesses() {
    const active = [];
    for (const [containerName, process] of this.activeRecoveryProcesses.entries()) {
      active.push({
        containerName,
        strategy: process.strategy,
        startTime: process.startTime,
        uptime: new Date() - process.startTime
      });
    }
    return active;
  }

  /**
   * Calculate median value
   */
  _calculateMedian(values) {
    if (values.length === 0) return 0;
    const sorted = values.sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Generate recovery report
   */
  generateRecoveryReport(containerName) {
    const metrics = this.calculateSLIMetrics(containerName);
    const policy = this.recoveryPolicies.get(containerName);

    return {
      containerName,
      policy: policy || { status: 'no policy registered' },
      metrics,
      recommendations: this._generateRecommendations(metrics, policy)
    };
  }

  /**
   * Generate recommendations based on metrics
   */
  _generateRecommendations(metrics, policy) {
    const recommendations = [];

    if (metrics.successRate < 50) {
      recommendations.push('❌ Low success rate - consider manual recovery or policy change');
    }
    if (metrics.avgMTTRMs > 30000) {
      recommendations.push('⚠️ High average MTTR - recovery is slow, may need optimization');
    }
    if (metrics.totalRecoveries > 10) {
      recommendations.push('⚠️ Container is recovering frequently - may indicate deeper issue');
    }
    if (!policy) {
      recommendations.push('ℹ️ No recovery policy set - configure automated recovery');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ System is healthy and recovering well');
    }

    return recommendations;
  }
}

module.exports = new RecoveryService();
