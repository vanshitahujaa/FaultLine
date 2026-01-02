import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import DeploymentForm from './DeploymentForm';
import ContainersList from './ContainersList';
import F              <div className="logs-header">
                <button onClick={loadLogs} className="btn-secondary btn-sm">
                  {logsLoading ? 'Refreshing...' : 'Refresh'}
                </button>
                <span className="log-count">{Array.isArray(logs) ? logs.length : 0} lines</span>
              </div>Injector from './FailureInjector';
import Timeline from './Timeline';
import '../styles/dashboard.css';

function Dashboard() {
  const [containers, setContainers] = useState([]);
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [logs, setLogs] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [logsLoading, setLogsLoading] = useState(false);

  // Check backend status
  useEffect(() => {
    const checkBackend = async () => {
      try {
        await apiService.ping();
        setBackendStatus('connected');
      } catch (err) {
        setBackendStatus('disconnected');
        setError('Backend unreachable at http://localhost:3000');
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 10000);
    return () => clearInterval(interval);
  }, []);

  // Load containers periodically
  const loadContainers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.listContainers();
      setContainers(response.data.containers || []);
    } catch (err) {
      setError(err.response?.data?.details || 'Failed to load containers');
    } finally {
      setLoading(false);
    }
  };

  // Load health for selected container
  useEffect(() => {
    if (selectedContainer) {
      const loadHealth = async () => {
        try {
          const response = await apiService.getContainerHealth(selectedContainer);
          setHealth(response.data.health);
        } catch (err) {
          console.error('Failed to load health:', err);
        }
      };

      loadHealth();
      const interval = setInterval(loadHealth, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedContainer]);

  // Load timeline for selected container
  useEffect(() => {
    if (selectedContainer) {
      const loadTimeline = async () => {
        try {
          const response = await apiService.getTimeline(selectedContainer);
          setTimeline(response.data.timeline);
        } catch (err) {
          console.error('Failed to load timeline:', err);
        }
      };

      loadTimeline();
      const interval = setInterval(loadTimeline, 2000);
      return () => clearInterval(interval);
    }
  }, [selectedContainer]);

  // Load logs for selected container
  const loadLogs = async () => {
    if (!selectedContainer) return;
    setLogsLoading(true);
    try {
      const response = await apiService.getContainerLogs(selectedContainer, 100);
      const logsData = response.data?.logs || response.logs || [];
      // Ensure logs is an array
      setLogs(Array.isArray(logsData) ? logsData : []);
    } catch (err) {
      console.error('Failed to load logs:', err);
      setLogs([]); // Reset to empty array on error
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedContainer) {
      loadLogs();
      const interval = setInterval(loadLogs, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedContainer]);

  const handleDeploySuccess = () => {
    setError(null);
    loadContainers();
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>🔥 FaultLine</h1>
          <p className="subtitle">Chaos Engineering Platform for Docker</p>
        </div>
        <div className={`status-badge ${backendStatus}`}>
          {backendStatus === 'connected' ? '✅ Connected' : '❌ Disconnected'}
        </div>
      </header>

      <main className="dashboard-main">
        {error && <div className="error-banner">{error}</div>}

        {/* Top Row: Deployment + Containers + Chaos Controls */}
        <div className="dashboard-grid-4">
          {/* Panel 1: Deployment */}
          <section className="panel panel-lg">
            <h2>🚀 Deploy</h2>
            <DeploymentForm onSuccess={handleDeploySuccess} />
            <button onClick={loadContainers} className="btn-secondary w-100 mt-2">
              Refresh List
            </button>
          </section>

          {/* Panel 2: Containers List */}
          <section className="panel panel-lg">
            <h2>📦 Containers ({containers.length})</h2>
            {loading ? (
              <p className="text-muted">Loading...</p>
            ) : containers.length === 0 ? (
              <p className="text-muted">No containers deployed</p>
            ) : (
              <ContainersList
                containers={containers}
                selectedContainer={selectedContainer}
                onSelect={setSelectedContainer}
              />
            )}
          </section>

          {/* Panel 3: Failure Injection */}
          {selectedContainer && (
            <section className="panel panel-lg">
              <h2>⚡ Chaos Controls</h2>
              <FailureInjector containerName={selectedContainer} />
            </section>
          )}

          {/* Panel 4: Health Status */}
          {selectedContainer && health && (
            <section className="panel panel-lg">
              <h2>💓 Health</h2>
              <div className="health-status">
                <div className="health-item">
                  <label>Status</label>
                  <div className={`status-badge ${health.running ? 'connected' : 'disconnected'}`}>
                    {health.running ? '✅ Running' : '❌ Stopped'}
                  </div>
                </div>
                <div className="health-item">
                  <label>Exit Code</label>
                  <p className="code">{health.exitCode || 'N/A'}</p>
                </div>
                <div className="health-item">
                  <label>Container ID</label>
                  <p className="code small">{health.id?.substring(0, 12)}...</p>
                </div>
                <div className="health-item">
                  <label>Started</label>
                  <p className="code small">{new Date(health.startedAt).toLocaleTimeString()}</p>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Bottom Row: Logs + Timeline */}
        {selectedContainer && (
          <div className="dashboard-grid-2">
            {/* Logs Viewer */}
            <section className="panel">
              <h2>📋 Logs</h2>
              <div className="logs-toolbar">
                <button onClick={loadLogs} className="btn-secondary">
                  {logsLoading ? 'Refreshing...' : 'Refresh'}
                </button>
                <span className="log-count">{Array.isArray(logs) ? logs.length : 0} lines</span>
              </div>
              <div className="logs-container">
                {!logs || logs.length === 0 ? (
                  <p className="text-muted">No logs available</p>
                ) : (
                  logs.map((line, idx) => (
                    <div key={idx} className="log-line">
                      {line}
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Timeline */}
            {timeline && (
              <section className="panel">
                <h2>📊 Recovery Timeline</h2>
                <div className="timeline-stats">
                  <div className="stat">
                    <span className="label">Total Failures</span>
                    <span className="value">{timeline.totalFailures || 0}</span>
                  </div>
                  <div className="stat">
                    <span className="label">Recovered</span>
                    <span className="value">{timeline.totalRecoveries || 0}</span>
                  </div>
                </div>
                <Timeline timeline={timeline} containerName={selectedContainer} />
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
