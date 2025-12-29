import React, { useState } from 'react';
import { apiService } from '../services/api';
import '../styles/form.css';

function DeploymentForm({ onSuccess }) {
  const [deployMode, setDeployMode] = useState('image'); // 'image' or 'github'
  const [image, setImage] = useState('nginx:latest');
  const [containerName, setContainerName] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [githubBranch, setGithubBranch] = useState('main');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (deployMode === 'image') {
        // Deploy from Docker image
        const response = await apiService.deployContainer(image, containerName);
        setSuccess(`Container "${containerName}" deployed successfully from ${image}!`);
        setImage('nginx:latest');
        setContainerName('');
      } else {
        // Deploy from GitHub (future enhancement)
        setError('GitHub deployment coming soon! Clone repo → build Dockerfile → deploy');
        console.log('GitHub deployment:', { githubRepo, githubBranch, containerName });
      }
      
      onSuccess();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 
                       err.response?.data?.error || 
                       'Deployment failed';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      {error && <div className="form-error">❌ {error}</div>}
      {success && <div className="form-success">✅ {success}</div>}

      {/* Deployment Mode Selector */}
      <div className="mode-selector">
        <label className={`mode-tab ${deployMode === 'image' ? 'active' : ''}`}>
          <input
            type="radio"
            value="image"
            checked={deployMode === 'image'}
            onChange={(e) => setDeployMode(e.target.value)}
          />
          <span>🐳 Docker Image</span>
        </label>
        <label className={`mode-tab ${deployMode === 'github' ? 'active' : ''}`}>
          <input
            type="radio"
            value="github"
            checked={deployMode === 'github'}
            onChange={(e) => setDeployMode(e.target.value)}
          />
          <span>🐙 GitHub Repository</span>
        </label>
      </div>

      {/* Docker Image Mode */}
      {deployMode === 'image' && (
        <>
          <div className="form-group">
            <label htmlFor="image">Container Image</label>
            <input
              id="image"
              type="text"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="e.g., nginx:latest, ubuntu:22.04"
              required
            />
            <small>Pull from Docker Hub or specify a custom image</small>
          </div>

          <div className="form-group">
            <label htmlFor="containerName">Container Name</label>
            <input
              id="containerName"
              type="text"
              value={containerName}
              onChange={(e) => setContainerName(e.target.value)}
              placeholder="e.g., web-server, my-app"
              required
            />
            <small>Unique identifier for this container</small>
          </div>
        </>
      )}

      {/* GitHub Mode */}
      {deployMode === 'github' && (
        <>
          <div className="form-group">
            <label htmlFor="githubRepo">GitHub Repository</label>
            <input
              id="githubRepo"
              type="text"
              value={githubRepo}
              onChange={(e) => setGithubRepo(e.target.value)}
              placeholder="e.g., user/repo or https://github.com/user/repo"
              required={deployMode === 'github'}
            />
            <small>Repository must contain a Dockerfile</small>
          </div>

          <div className="form-group">
            <label htmlFor="githubBranch">Branch</label>
            <input
              id="githubBranch"
              type="text"
              value={githubBranch}
              onChange={(e) => setGithubBranch(e.target.value)}
              placeholder="main"
            />
            <small>Default: main</small>
          </div>

          <div className="form-group">
            <label htmlFor="githubContainerName">Container Name</label>
            <input
              id="githubContainerName"
              type="text"
              value={containerName}
              onChange={(e) => setContainerName(e.target.value)}
              placeholder="e.g., github-repo-app"
              required={deployMode === 'github'}
            />
            <small>Name for the deployed container</small>
          </div>
        </>
      )}

      <button
        type="submit"
        disabled={loading || !containerName || (deployMode === 'github' && !githubRepo)}
        className="btn-primary"
      >
        {loading ? 'Deploying...' : `Deploy from ${deployMode === 'image' ? 'Image' : 'GitHub'}`}
      </button>
    </form>
  );
}

export default DeploymentForm;
