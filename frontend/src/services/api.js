import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 600000 // 10 minute timeout for builds
});

export const apiService = {
  // Health
  ping: () => axios.get('http://localhost:3000/ping'),

  // Deployment
  deployContainer: (image, containerName) =>
    api.post('/deploy', { image, containerName }),

  deployFromGitHub: (repoUrl, containerName, branch = 'main') =>
    api.post('/deploy-from-github', { repoUrl, containerName, branch }),

  // Containers
  listContainers: () => api.get('/containers'),
  getContainerHealth: (containerName) =>
    api.get(`/health/${containerName}`),
  getContainerLogs: (containerName, tail = 100) =>
    api.get(`/logs/${containerName}`, { params: { tail } }),

  // Failures
  injectKillFailure: (containerName, delay = 0) =>
    api.post('/failures/kill', { containerName, delay }),

  injectLatencyFailure: (containerName, latencyMs = 1000, duration = 60000) =>
    api.post('/failures/latency', { containerName, latencyMs, duration }),

  injectMemoryFailure: (containerName, memoryLimit = '256m', duration = 60000) =>
    api.post('/failures/memory', { containerName, memoryLimit, duration }),

  // Timelines
  getTimeline: (containerName) => api.get(`/timeline/${containerName}`),
  getAllTimelines: () => api.get('/timelines')
};

export default api;
