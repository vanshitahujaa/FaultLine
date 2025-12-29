import React from 'react';
import '../styles/timeline.css';

function Timeline({ timeline, containerName }) {
  if (!timeline || !timeline.events || timeline.events.length === 0) {
    return <p className="text-muted">No events recorded</p>;
  }

  const events = timeline.events || [];
  const recoveryEvents = events.filter(e => e.status === 'recovered');

  return (
    <div className="timeline-container">
      <div className="timeline-stats">
        <div className="stat">
          <span className="label">Total Failures</span>
          <span className="value">{timeline.totalFailures || 0}</span>
        </div>
        <div className="stat">
          <span className="label">Recoveries</span>
          <span className="value">{timeline.totalRecoveries || 0}</span>
        </div>
      </div>

      {recoveryEvents.length > 0 && (
        <div className="recovery-metrics">
          <h4>Recovery Metrics</h4>
          {recoveryEvents.map((event, idx) => {
            const duration = event.metadata?.recoveryDurationMs || 0;
            return (
              <div key={idx} className="metric-item">
                <div className="metric-label">
                  Recovery #{idx + 1}
                </div>
                <div className="metric-value">
                  {(duration / 1000).toFixed(2)}s
                </div>
                {event.metadata?.failureTime && (
                  <div className="metric-time">
                    {new Date(event.metadata.failureTime).toLocaleTimeString()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="timeline-events">
        <h4>Event History</h4>
        <div className="events-list">
          {events.map((event, idx) => (
            <div key={idx} className={`event ${event.status}`}>
              <div className="event-header">
                <span className="event-type">{event.type.toUpperCase()}</span>
                <span className={`event-status ${event.status}`}>
                  {event.status}
                </span>
              </div>
              <div className="event-time">
                {new Date(event.timestamp).toLocaleTimeString()}
              </div>
              {event.metadata && (
                <div className="event-metadata">
                  {event.metadata.recoveryDurationMs && (
                    <span>Recovery: {(event.metadata.recoveryDurationMs / 1000).toFixed(2)}s</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Timeline;
