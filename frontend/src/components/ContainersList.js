import React, { useState } from 'react';
import { apiService } from '../services/api';
import FailureInjector from './FailureInjector';
import { normalizeContainerName, getContainerDisplayName } from '../utils/containerUtils';
import '../styles/containers.css';

function ContainersList({ containers, selectedContainer, onSelect }) {
  const [expandedContainer, setExpandedContainer] = useState(selectedContainer);

  const toggleExpand = (containerName) => {
    setExpandedContainer(expandedContainer === containerName ? null : containerName);
    onSelect(containerName);
  };

  if (!containers || containers.length === 0) {
    return <p className="text-muted">No containers available</p>;
  }

  return (
    <div className="containers-list">
      {containers.map((container) => {
        const displayName = getContainerDisplayName(container);
        return (
          <div key={container.id} className="container-card">
            <div
              className="container-header"
              onClick={() => toggleExpand(displayName)}
            >
              <div className="container-info">
                <h3>{displayName}</h3>
                <p className="text-muted">{container.image}</p>
              </div>
              <span className={`status-badge ${container.state}`}>
                {container.state || 'unknown'}
              </span>
            </div>

            {expandedContainer === displayName && (
              <div className="container-details">
                <div className="details-grid">
                  <div className="detail-item">
                    <span className="label">ID</span>
                    <span className="value">{container.id.substring(0, 12)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Status</span>
                    <span className="value">{container.status}</span>
                  </div>
                </div>

                <FailureInjector
                  containerName={displayName}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ContainersList;
