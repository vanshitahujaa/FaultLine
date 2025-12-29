import React, { useState } from 'react';
import { apiService } from '../services/api';
import '../styles/failures.css';

function FailureInjector({ containerName }) {
  const [killDelay, setKillDelay] = useState(0);
  const [latencyMs, setLatencyMs] = useState(1000);
  const [latencyDuration, setLatencyDuration] = useState(60);
  const [memoryLimit, setMemoryLimit] = useState('256m');
  const [memoryDuration, setMemoryDuration] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const injectFailure = async (failureType) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let response;
      switch (failureType) {
        case 'kill':
          response = await apiService.injectKillFailure(containerName, parseInt(killDelay));
          break;
        case 'latency':
          response = await apiService.injectLatencyFailure(
            containerName,
            parseInt(latencyMs),
            parseInt(latencyDuration) * 1000
          );
          break;
        case 'memory':
          response = await apiService.injectMemoryFailure(
            containerName,
            memoryLimit,
            parseInt(memoryDuration) * 1000
          );
          break;
        default:
          throw new Error('Unknown failure type');
      }

      setSuccess(`${failureType.toUpperCase()} failure injected on ${containerName}!`);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      const errorMsg = err.response?.data?.details || `${failureType} injection failed`;
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="failure-injector">
      {error && <div className="error-message">❌ {error}</div>}
      {success && <div className="success-message">✅ {success}</div>}

      {/* Kill Failure */}
      <div className="failure-group">
        <h4>💥 Kill Container</h4>
        <p className="description">Stop the container instantly or after a delay</p>
        <div className="control-group">
          <label>
            Delay (ms):
            <input
              type="number"
              min="0"
              max="10000"
              step="100"
              value={killDelay}
              onChange={(e) => setKillDelay(e.target.value)}
              disabled={loading}
            />
          </label>
          <span className="value-display">{killDelay}ms</span>
        </div>
        <button
          className="btn-kill"
          onClick={() => injectFailure('kill')}
          disabled={loading}
        >
          {loading ? 'Injecting...' : 'Inject Kill'}
        </button>
      </div>

      {/* Latency Failure */}
      <div className="failure-group">
        <h4>🐢 Inject Latency</h4>
        <p className="description">Add network/response delay to simulate slow services</p>
        <div className="control-group">
          <label>
            Latency (ms):
            <input
              type="range"
              min="0"
              max="10000"
              step="100"
              value={latencyMs}
              onChange={(e) => setLatencyMs(e.target.value)}
              disabled={loading}
            />
          </label>
          <span className="value-display">{latencyMs}ms</span>
        </div>
        <div className="control-group">
          <label>
            Duration (seconds):
            <input
              type="range"
              min="1"
              max="600"
              step="1"
              value={latencyDuration}
              onChange={(e) => setLatencyDuration(e.target.value)}
              disabled={loading}
            />
          </label>
          <span className="value-display">{latencyDuration}s</span>
        </div>
        <button
          className="btn-latency"
          onClick={() => injectFailure('latency')}
          disabled={loading}
        >
          {loading ? 'Injecting...' : 'Inject Latency'}
        </button>
      </div>

      {/* Memory Failure */}
      <div className="failure-group">
        <h4>🧠 Memory Pressure</h4>
        <p className="description">Limit container memory to simulate resource exhaustion</p>
        <div className="control-group">
          <label>
            Memory Limit:
            <select
              value={memoryLimit}
              onChange={(e) => setMemoryLimit(e.target.value)}
              disabled={loading}
            >
              <option value="64m">64 MB</option>
              <option value="128m">128 MB</option>
              <option value="256m">256 MB</option>
              <option value="512m">512 MB</option>
              <option value="1g">1 GB</option>
            </select>
          </label>
        </div>
        <div className="control-group">
          <label>
            Duration (seconds):
            <input
              type="range"
              min="1"
              max="600"
              step="1"
              value={memoryDuration}
              onChange={(e) => setMemoryDuration(e.target.value)}
              disabled={loading}
            />
          </label>
          <span className="value-display">{memoryDuration}s</span>
        </div>
        <button
          className="btn-memory"
          onClick={() => injectFailure('memory')}
          disabled={loading}
        >
          {loading ? 'Injecting...' : 'Inject Memory Limit'}
        </button>
      </div>
    </div>
  );
}

export default FailureInjector;
