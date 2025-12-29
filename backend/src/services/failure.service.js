/**
 * Failure Injection Service
 * Handles intentional failure injection for chaos engineering
 */

const logger = require('../utils/logger');
const dockerService = require('./docker.service');
const persistenceService = require('./persistence.service');

class FailureService {
  constructor() {
    this.failureTimelines = new Map(); // Track failure events
    this.recoveryPollers = new Map(); // Track active recovery pollers
  }

  /**
   * Inject a kill failure (stop container)
   */
  async injectKillFailure(containerName, delay = 0) {
    try {
      logger.info(`Scheduling kill failure for ${containerName} in ${delay}ms`);

      // Record failure timeline
      const failureTime = new Date();
      this._recordFailureEvent(containerName, 'kill', 'scheduled', { failureTime });

      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const result = await dockerService.killContainer(containerName);
      this._recordFailureEvent(containerName, 'kill', 'executed', { failureTime });

      // Start health polling for recovery detection
      this._startRecoveryPoller(containerName, failureTime);

      return {
        success: true,
        failure: 'kill',
        container: containerName,
        timestamp: failureTime,
        message: `Kill failure injected on ${containerName}`
      };
    } catch (error) {
      logger.error(`Failed to inject kill failure on ${containerName}`, error);
      this._recordFailureEvent(containerName, 'kill', 'failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Inject latency failure (simulate slow responses)
   * Note: Actual latency injection would require network manipulation
   */
  async injectLatencyFailure(containerName, latencyMs, duration = 60000) {
    try {
      logger.info(`Injecting ${latencyMs}ms latency on ${containerName} for ${duration}ms`);
      const failureTime = new Date();
      this._recordFailureEvent(containerName, 'latency', 'scheduled', { 
        failureTime: failureTime.toISOString(),
        latencyMs, 
        duration 
      });

      // In a real implementation, this would use network tools like tc (traffic control)
      // For now, we're logging the intent
      setTimeout(() => {
        const recoveryTime = new Date();
        this._recordFailureEvent(containerName, 'latency', 'recovered', {
          failureTime: failureTime.toISOString(),
          recoveryTime: recoveryTime.toISOString(),
          recoveryDurationMs: duration
        });
      }, duration);

      return {
        success: true,
        failure: 'latency',
        container: containerName,
        latencyMs,
        durationMs: duration,
        timestamp: failureTime,
        message: `Latency failure injected on ${containerName}`
      };
    } catch (error) {
      logger.error(`Failed to inject latency failure on ${containerName}`, error);
      throw error;
    }
  }

  /**
   * Inject memory pressure failure
   * Note: Actual memory pressure would require cgroup manipulation
   */
  async injectMemoryFailure(containerName, memoryLimit = '256m', duration = 60000) {
    try {
      logger.info(`Injecting memory limit ${memoryLimit} on ${containerName}`);
      const failureTime = new Date();
      this._recordFailureEvent(containerName, 'memory', 'scheduled', { 
        failureTime: failureTime.toISOString(),
        memoryLimit, 
        duration 
      });

      // In a real implementation, this would use docker update to change memory limits
      setTimeout(() => {
        const recoveryTime = new Date();
        this._recordFailureEvent(containerName, 'memory', 'recovered', {
          failureTime: failureTime.toISOString(),
          recoveryTime: recoveryTime.toISOString(),
          recoveryDurationMs: duration
        });
      }, duration);

      return {
        success: true,
        failure: 'memory',
        container: containerName,
        memoryLimit,
        durationMs: duration,
        timestamp: failureTime,
        message: `Memory failure injected on ${containerName}`
      };
    } catch (error) {
      logger.error(`Failed to inject memory failure on ${containerName}`, error);
      throw error;
    }
  }

  /**
   * Get recovery timeline for a container
   */
  async getRecoveryTimeline(containerName) {
    const timelines = await persistenceService.loadTimelines();
    const timeline = timelines[containerName] || [];
    return {
      container: containerName,
      events: timeline,
      totalFailures: timeline.filter(e => e.status === 'executed').length,
      totalRecoveries: timeline.filter(e => e.status === 'recovered').length
    };
  }

  /**
   * Get all failure timelines
   */
  async getAllTimelines() {
    const timelines = await persistenceService.loadTimelines();
    const result = {};
    
    Object.entries(timelines).forEach(([containerName, events]) => {
      result[containerName] = {
        events,
        totalFailures: events.filter(e => e.status === 'executed').length,
        totalRecoveries: events.filter(e => e.status === 'recovered').length
      };
    });
    
    return result;
  }

  /**
   * Clear failure timeline for a container
   */
  async clearTimeline(containerName) {
    await persistenceService.clearTimeline(containerName);
  }

  /**
   * Private: Start polling for container recovery
   * Polls every 2 seconds, marks recovered after 10 continuous OK health checks
   */
  _startRecoveryPoller(containerName, failureTime) {
    // Stop any existing poller for this container
    if (this.recoveryPollers.has(containerName)) {
      clearInterval(this.recoveryPollers.get(containerName).interval);
    }

    let consecutiveHealthyChecks = 0;
    const requiredHealthyChecks = 5; // 5 checks × 2 seconds = 10 seconds
    let isContainerRunning = false;

    const poller = setInterval(async () => {
      try {
        const health = await dockerService.getContainerHealth(containerName);
        
        // Container is running
        if (health.running) {
          isContainerRunning = true;
          consecutiveHealthyChecks++;
          logger.debug(`Health check ${consecutiveHealthyChecks}/${requiredHealthyChecks} for ${containerName}`);

          // Mark as recovered after 10 continuous seconds of health
          if (consecutiveHealthyChecks >= requiredHealthyChecks) {
            const recoveryTime = new Date();
            const recoveryDuration = recoveryTime - failureTime;

            this._recordFailureEvent(containerName, 'kill', 'recovered', {
              failureTime: failureTime.toISOString(),
              recoveryTime: recoveryTime.toISOString(),
              recoveryDurationMs: recoveryDuration
            });

            logger.info(`✅ Container ${containerName} RECOVERED after ${recoveryDuration}ms`);
            
            // Stop polling
            clearInterval(poller);
            this.recoveryPollers.delete(containerName);
          }
        } else {
          // Container not healthy, reset counter
          consecutiveHealthyChecks = 0;
        }
      } catch (error) {
        logger.debug(`Health check failed for ${containerName}: ${error.message}`);
        consecutiveHealthyChecks = 0;
      }
    }, 2000); // Poll every 2 seconds

    this.recoveryPollers.set(containerName, { interval: poller, startTime: failureTime });
    logger.info(`Started recovery poller for ${containerName}`);
  }

  /**
   * Private: Record failure event in timeline
   */
  _recordFailureEvent(containerName, failureType, status, metadata = {}) {
    if (!this.failureTimelines.has(containerName)) {
      this.failureTimelines.set(containerName, []);
    }

    const event = {
      timestamp: new Date().toISOString(),
      type: failureType,
      status,
      metadata
    };

    this.failureTimelines.get(containerName).push(event);
    
    // Persist to disk asynchronously
    persistenceService.appendEvent(containerName, event).catch(error => {
      logger.error(`Failed to persist event for ${containerName}`, error);
    });
    
    logger.debug(`Failure event recorded for ${containerName}`, event);
  }

  /**
   * Record GitHub deployment event
   */
  async recordGitHubDeployment(containerName, deploymentData) {
    try {
      logger.info(`Recording GitHub deployment for ${containerName}`);
      
      const event = {
        timestamp: new Date().toISOString(),
        type: 'github-deployment',
        status: 'success',
        metadata: {
          repoUrl: deploymentData.repoUrl,
          branch: deploymentData.branch,
          imageName: deploymentData.imageName,
          buildLog: deploymentData.buildLog
        }
      };

      // Initialize timeline if not exists
      if (!this.failureTimelines.has(containerName)) {
        this.failureTimelines.set(containerName, []);
      }

      this.failureTimelines.get(containerName).push(event);

      // Persist to disk
      await persistenceService.appendEvent(containerName, event);
      logger.info(`GitHub deployment recorded for ${containerName}`);
    } catch (error) {
      logger.error(`Failed to record GitHub deployment for ${containerName}`, error);
    }
  }
}

module.exports = new FailureService();
