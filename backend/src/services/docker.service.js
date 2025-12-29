/**
 * Docker service - handles container management
 * Deploys, monitors, and controls Docker containers
 */

const Docker = require('dockerode');
const logger = require('../utils/logger');

const docker = new Docker();

class DockerService {
  /**
   * Pull image from Docker Hub
   */
  async pullImage(imageName) {
    try {
      logger.info(`Pulling image: ${imageName}`);
      const stream = await docker.pull(imageName);
      
      return new Promise((resolve, reject) => {
        docker.modem.followProgress(stream, (err, res) => {
          if (err) {
            logger.error('Error pulling image', err);
            reject(err);
          } else {
            logger.info(`Successfully pulled image: ${imageName}`);
            resolve(res);
          }
        });
      });
    } catch (error) {
      logger.error(`Failed to pull image ${imageName}`, error);
      throw error;
    }
  }

  /**
   * Create and start a Docker container
   */
  async createContainer(imageName, containerName, options = {}) {
    try {
      logger.info(`Creating container: ${containerName} from image: ${imageName}`);

      const containerOptions = {
        Image: imageName,
        name: containerName,
        HostConfig: {
          RestartPolicy: {
            Name: 'on-failure',
            MaximumRetryCount: 5
          }
        },
        ...options
      };

      const container = await docker.createContainer(containerOptions);
      logger.info(`Container created with ID: ${container.id}`);

      await container.start();
      logger.info(`Container ${containerName} started successfully`);

      return container;
    } catch (error) {
      logger.error(`Failed to create/start container ${containerName}`, error);
      throw error;
    }
  }

  /**
   * Get container by name
   */
  async getContainerByName(containerName) {
    try {
      const container = docker.getContainer(containerName);
      const data = await container.inspect();
      return container;
    } catch (error) {
      logger.error(`Container ${containerName} not found`, error);
      return null;
    }
  }

  /**
   * Get container health status
   */
  async getContainerHealth(containerName) {
    try {
      const container = docker.getContainer(containerName);
      const data = await container.inspect();

      return {
        id: data.Id,
        name: data.Name,
        state: data.State.Status,
        running: data.State.Running,
        exitCode: data.State.ExitCode,
        startedAt: data.State.StartedAt,
        finishedAt: data.State.FinishedAt
      };
    } catch (error) {
      logger.error(`Failed to get container health for ${containerName}`, error);
      throw error;
    }
  }

  /**
   * Kill (stop) a container
   */
  async killContainer(containerName) {
    try {
      logger.info(`Killing container: ${containerName}`);
      const container = docker.getContainer(containerName);
      await container.kill();
      logger.info(`Container ${containerName} killed successfully`);
      return { success: true, message: `Container ${containerName} killed` };
    } catch (error) {
      logger.error(`Failed to kill container ${containerName}`, error);
      throw error;
    }
  }

  /**
   * Get container logs
   */
  async getContainerLogs(containerName, tail = 100) {
    try {
      const container = docker.getContainer(containerName);
      const logs = await container.logs({
        stdout: true,
        stderr: true,
        tail: tail
      });
      return logs.toString();
    } catch (error) {
      logger.error(`Failed to get logs for container ${containerName}`, error);
      throw error;
    }
  }

  /**
   * List all containers
   */
  async listContainers(all = false) {
    try {
      const containers = await docker.listContainers({ all });
      return containers.map(c => ({
        id: c.Id,
        names: c.Names,
        image: c.Image,
        status: c.Status,
        state: c.State
      }));
    } catch (error) {
      logger.error('Failed to list containers', error);
      throw error;
    }
  }
}

module.exports = new DockerService();
