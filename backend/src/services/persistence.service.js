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
   * Get the path to the timelines file
   */
  getTimelinesPath() {
    return TIMELINES_FILE;
  }
}

module.exports = new PersistenceService();
