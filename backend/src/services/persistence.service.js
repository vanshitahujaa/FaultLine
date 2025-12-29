/**
 * Timeline Persistence Service
 * Handles saving and loading failure timelines to/from JSON file
 */

const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

const TIMELINES_DIR = path.join(__dirname, '../../data');
const TIMELINES_FILE = path.join(TIMELINES_DIR, 'timelines.json');

class PersistenceService {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize persistence (create data directory if needed)
   */
  async initialize() {
    try {
      await fs.mkdir(TIMELINES_DIR, { recursive: true });
      this.initialized = true;
      logger.info(`Persistence initialized at ${TIMELINES_FILE}`);
    } catch (error) {
      logger.error('Failed to initialize persistence', error);
      throw error;
    }
  }

  /**
   * Load all timelines from disk
   */
  async loadTimelines() {
    try {
      const data = await fs.readFile(TIMELINES_FILE, 'utf-8');
      const timelines = JSON.parse(data);
      logger.info(`Loaded timelines for ${Object.keys(timelines).length} containers`);
      return timelines;
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.info('No existing timelines file found, starting fresh');
        return {};
      }
      logger.error('Failed to load timelines', error);
      throw error;
    }
  }

  /**
   * Save timelines to disk
   */
  async saveTimelines(timelines) {
    try {
      const data = JSON.stringify(timelines, null, 2);
      await fs.writeFile(TIMELINES_FILE, data, 'utf-8');
      logger.debug('Timelines persisted to disk');
    } catch (error) {
      logger.error('Failed to save timelines', error);
      throw error;
    }
  }

  /**
   * Append a failure event to a container's timeline
   */
  async appendEvent(containerName, event) {
    try {
      const timelines = await this.loadTimelines();
      
      if (!timelines[containerName]) {
        timelines[containerName] = [];
      }

      timelines[containerName].push(event);
      await this.saveTimelines(timelines);
      logger.debug(`Event appended for ${containerName}`);
    } catch (error) {
      logger.error(`Failed to append event for ${containerName}`, error);
      throw error;
    }
  }

  /**
   * Clear timeline for a container
   */
  async clearTimeline(containerName) {
    try {
      const timelines = await this.loadTimelines();
      delete timelines[containerName];
      await this.saveTimelines(timelines);
      logger.info(`Timeline cleared for ${containerName}`);
    } catch (error) {
      logger.error(`Failed to clear timeline for ${containerName}`, error);
      throw error;
    }
  }

  /**
   * Record CI/CD pipeline execution
   */
  async recordPipelineExecution(containerName, pipelineData) {
    try {
      const timelines = await this.loadTimelines();
      if (!timelines[containerName]) {
        timelines[containerName] = [];
      }

      timelines[containerName].push({
        type: 'pipeline',
        timestamp: new Date().toISOString(),
        ...pipelineData
      });

      await this.saveTimelines(timelines);
      logger.info(`Pipeline execution recorded for ${containerName}`);
    } catch (error) {
      logger.error(`Failed to record pipeline execution for ${containerName}`, error);
    }
  }

  /**
   * Record recovery attempt
   */
  async recordRecoveryAttempt(containerName, recoveryData) {
    try {
      const timelines = await this.loadTimelines();
      if (!timelines[containerName]) {
        timelines[containerName] = [];
      }

      timelines[containerName].push({
        type: 'recovery',
        timestamp: new Date().toISOString(),
        ...recoveryData
      });

      await this.saveTimelines(timelines);
      logger.info(`Recovery attempt recorded for ${containerName}`);
    } catch (error) {
      logger.error(`Failed to record recovery attempt for ${containerName}`, error);
    }
  }

  /**
   * Record recovery metric
   */
  async recordRecoveryMetric(containerName, metric) {
    try {
      const timelines = await this.loadTimelines();
      if (!timelines[containerName]) {
        timelines[containerName] = [];
      }

      timelines[containerName].push({
        type: 'metric',
        timestamp: new Date().toISOString(),
        ...metric
      });

      await this.saveTimelines(timelines);
    } catch (error) {
      logger.error(`Failed to record recovery metric for ${containerName}`, error);
    }
  }

  /**
   * Get pipeline history for a container
   */
  async getPipelineHistory(containerName) {
    try {
      const timelines = await this.loadTimelines();
      const events = timelines[containerName] || [];
      return events.filter(e => e.type === 'pipeline');
    } catch (error) {
      logger.error(`Failed to get pipeline history for ${containerName}`, error);
      return [];
    }
  }

  /**
   * Get recovery history for a container
   */
  async getRecoveryHistory(containerName) {
    try {
      const timelines = await this.loadTimelines();
      const events = timelines[containerName] || [];
      return events.filter(e => e.type === 'recovery' || e.type === 'metric');
    } catch (error) {
      logger.error(`Failed to get recovery history for ${containerName}`, error);
      return [];
    }
  }

  /**
   * Get the path to the timelines file
   */
  getTimelinesPath() {
    return TIMELINES_FILE;
  }
}

module.exports = new PersistenceService();
