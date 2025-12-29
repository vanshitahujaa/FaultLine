# CI/CD Pipeline & Recovery System

## Overview

FaultLine now includes two powerful systems for enterprise-grade chaos engineering:

1. **CI/CD Pipeline Service** - Automated build, test, and deployment from GitHub repositories
2. **Recovery & Healing Service** - Automatic container recovery with MTTR tracking and SLI metrics

## CI/CD Pipeline Service

### What It Does

The CI/CD pipeline automates the complete application deployment workflow:

```
1. Clone Repository  → Pull code from GitHub with branch support
2. Validate Build    → Check for Dockerfile, detect code issues
3. Run Tests         → Execute npm test if configured
4. Build Image       → docker build from Dockerfile
5. Deploy Container  → Create and start container
6. Smoke Tests       → Verify container is healthy and responding
```

### API Endpoints

#### Execute Pipeline
```bash
POST /api/pipeline/execute
Content-Type: application/json

{
  "repoUrl": "docker-library/nginx",  // or "https://github.com/user/repo.git"
  "containerName": "my-nginx-app",
  "branch": "main"                     // optional, defaults to 'main'
}

Response: 202 Accepted (pipeline runs in background)
{
  "message": "CI/CD pipeline started",
  "containerName": "my-nginx-app",
  "repoUrl": "docker-library/nginx",
  "branch": "main",
  "estimatedDuration": "2-5 minutes"
}
```

#### Get Pipeline Logs
```bash
GET /api/pipeline/logs/:containerName

Response:
{
  "success": true,
  "containerName": "my-nginx-app",
  "logs": [
    "[2025-12-30T...] [PIPELINE] Starting CI/CD for docker-library/nginx",
    "[2025-12-30T...] [STEP 1/6] Cloning repository...",
    "[2025-12-30T...] ✅ Repository cloned to /tmp/faultline-ci-uuid",
    ...
  ],
  "logCount": 42
}
```

#### Get Pipeline History
```bash
GET /api/pipeline/history/:containerName

Response:
{
  "success": true,
  "containerName": "my-nginx-app",
  "executions": [
    {
      "pipelineId": "uuid-1",
      "status": "success",
      "repoUrl": "docker-library/nginx",
      "branch": "main",
      "durationMs": 125000,
      "stepsCompleted": 6,
      "timestamp": "2025-12-30T10:00:00Z"
    }
  ],
  "totalExecutions": 3
}
```

### Example: Deploy from GitHub

```bash
# Deploy a Node.js application from GitHub
curl -X POST http://localhost:3000/api/pipeline/execute \
  -H "Content-Type: application/json" \
  -d '{
    "repoUrl": "https://github.com/user/my-app.git",
    "containerName": "production-app",
    "branch": "main"
  }'

# Monitor progress with logs
curl http://localhost:3000/api/pipeline/logs/production-app

# After deployment, get history
curl http://localhost:3000/api/pipeline/history/production-app
```

## Recovery & Healing Service

### What It Does

The Recovery Service automatically detects and repairs failed containers, tracking recovery metrics:

```
Container Failure Detected
        ↓
Apply Recovery Strategy
        ↓
Monitor Health Polling
        ↓
Record MTTR (Mean Time To Recovery)
        ↓
Update SLI Metrics
```

### Recovery Strategies

#### 1. Restart (Default)
- Gracefully stops the container
- Restarts from same image
- Fast recovery (typically 2-5 seconds)
- **Best for:** Temporary failures, crashes

```bash
POST /api/recovery/start
{
  "containerName": "my-app",
  "strategy": "restart",
  "options": {
    "healthCheckInterval": 5000,
    "maxRetries": 3,
    "retryDelay": 10000
  }
}
```

#### 2. Rebuild
- Removes the failed container
- Redeploys from original image
- Longer recovery (10-30 seconds)
- **Best for:** Persistent state corruption, resource exhaustion

```bash
POST /api/recovery/start
{
  "containerName": "my-app",
  "strategy": "rebuild"
}
```

#### 3. Manual
- Records the failure for human review
- No automatic actions
- **Best for:** Critical services, debugging

```bash
POST /api/recovery/start
{
  "containerName": "my-app",
  "strategy": "manual"
}
```

### API Endpoints

#### Start Auto-Recovery
```bash
POST /api/recovery/start
Content-Type: application/json

{
  "containerName": "my-app",
  "strategy": "restart",          // 'restart', 'rebuild', or 'manual'
  "options": {
    "healthCheckInterval": 5000,  // Check every 5 seconds
    "maxRetries": 3,              // Max 3 retry attempts
    "retryDelay": 10000          // Wait 10s between retries
  }
}

Response:
{
  "success": true,
  "message": "Auto-recovery started for my-app",
  "containerName": "my-app",
  "strategy": "restart"
}
```

#### Stop Auto-Recovery
```bash
POST /api/recovery/stop/:containerName

Response:
{
  "success": true,
  "message": "Auto-recovery stopped for my-app"
}
```

#### Get Active Recovery Processes
```bash
GET /api/recovery/active

Response:
{
  "success": true,
  "activeRecoveries": [
    {
      "containerName": "my-app",
      "strategy": "restart",
      "startTime": "2025-12-30T10:00:00Z",
      "uptime": 3600000  // milliseconds
    }
  ],
  "count": 1
}
```

#### Get Recovery Metrics (SLI)
```bash
GET /api/recovery/metrics/:containerName

Response:
{
  "success": true,
  "containerName": "my-app",
  "metrics": {
    "totalRecoveries": 5,
    "successfulRecoveries": 5,
    "successRate": "100%",
    "avgMTTRMs": 4200,            // Average Time To Recovery
    "medianMTTRMs": 3800,
    "lastRecovery": "2025-12-30T10:05:00Z",
    "recentMetrics": [...]
  },
  "report": {
    "containerName": "my-app",
    "policy": { "strategy": "restart" },
    "metrics": {...},
    "recommendations": [
      "✅ System is healthy and recovering well"
    ]
  }
}
```

#### Get Comprehensive Monitoring Report
```bash
GET /api/report/monitoring/:containerName

Response:
{
  "containerName": "my-app",
  "timestamp": "2025-12-30T10:10:00Z",
  "health": {
    "running": true,
    "exitCode": 0,
    "startTime": "2025-12-30T10:05:00Z"
  },
  "sliMetrics": {
    "totalRecoveries": 5,
    "successRate": "100%",
    "avgMTTRMs": 4200
  },
  "pipelineExecutions": 1,
  "recoveryEvents": 5,
  "summary": {
    "status": "running",
    "successRate": "100%",
    "avgMTTR": "4200ms",
    "recommendations": [
      "✅ System is healthy and recovering well"
    ]
  }
}
```

### Example: Set Up Complete Recovery

```bash
# 1. Deploy an application
curl -X POST http://localhost:3000/api/pipeline/execute \
  -H "Content-Type: application/json" \
  -d '{
    "repoUrl": "https://github.com/user/web-app.git",
    "containerName": "web-app",
    "branch": "main"
  }'

# 2. Start auto-recovery
curl -X POST http://localhost:3000/api/recovery/start \
  -H "Content-Type: application/json" \
  -d '{
    "containerName": "web-app",
    "strategy": "restart",
    "options": {
      "healthCheckInterval": 3000,
      "maxRetries": 5
    }
  }'

# 3. Inject a failure to test recovery
curl -X POST http://localhost:3000/api/failures/kill \
  -H "Content-Type: application/json" \
  -d '{
    "containerName": "web-app",
    "delay": 0
  }'

# 4. Monitor recovery metrics
curl http://localhost:3000/api/recovery/metrics/web-app

# 5. View complete report
curl http://localhost:3000/api/report/monitoring/web-app
```

## Metrics & Monitoring

### SLI (Service Level Indicators)

The recovery system automatically tracks:

- **Total Recoveries**: Number of times recovery was triggered
- **Success Rate**: % of successful recoveries
- **Avg MTTR**: Average Mean Time To Recovery (milliseconds)
- **Median MTTR**: Median recovery time (handles outliers)
- **Last Recovery**: Timestamp of most recent recovery

### Example Metrics

```json
{
  "totalRecoveries": 10,
  "successfulRecoveries": 9,
  "successRate": "90%",
  "avgMTTRMs": 4500,
  "medianMTTRMs": 3200,
  "lastRecovery": "2025-12-30T10:05:00Z",
  "recommendations": [
    "⚠️ Low success rate - consider manual recovery or policy change",
    "⚠️ Container is recovering frequently - may indicate deeper issue"
  ]
}
```

### Recommendations

The system provides intelligent recommendations:

- **Low success rate**: Suggest manual intervention
- **High MTTR**: Indicates slow recovery, may need optimization
- **Frequent recoveries**: Points to underlying issues
- **No recovery policy**: Suggests configuring automated recovery

## Combined Workflow Example

### Scenario: Deploy → Break → Recover → Monitor

```bash
#!/bin/bash

# 1. DEPLOY APPLICATION FROM GITHUB
echo "1️⃣ Deploying application..."
curl -X POST http://localhost:3000/api/pipeline/execute \
  -H "Content-Type: application/json" \
  -d '{
    "repoUrl": "docker-library/nginx",
    "containerName": "web-server",
    "branch": "main"
  }'

sleep 5  # Wait for deployment

# 2. SETUP AUTO-RECOVERY
echo "2️⃣ Setting up auto-recovery..."
curl -X POST http://localhost:3000/api/recovery/start \
  -H "Content-Type: application/json" \
  -d '{
    "containerName": "web-server",
    "strategy": "restart"
  }'

sleep 2

# 3. INJECT FAILURE (chaos engineering test)
echo "3️⃣ Injecting kill failure..."
curl -X POST http://localhost:3000/api/failures/kill \
  -H "Content-Type: application/json" \
  -d '{
    "containerName": "web-server",
    "delay": 0
  }'

sleep 5  # Wait for recovery to happen

# 4. VIEW METRICS
echo "4️⃣ Recovery metrics:"
curl http://localhost:3000/api/recovery/metrics/web-server | jq '.metrics'

# 5. VIEW FULL REPORT
echo "5️⃣ Full monitoring report:"
curl http://localhost:3000/api/report/monitoring/web-server | jq '.'
```

## Timeline Integration

All CI/CD and recovery events are recorded in the timeline:

```bash
GET /api/timeline/:containerName

Response:
{
  "timeline": [
    {
      "type": "pipeline",
      "status": "success",
      "repoUrl": "docker-library/nginx",
      "durationMs": 125000,
      "timestamp": "2025-12-30T10:00:00Z"
    },
    {
      "type": "recovery",
      "strategy": "restart",
      "mttrMs": 4200,
      "attemptsNeeded": 1,
      "timestamp": "2025-12-30T10:05:00Z"
    }
  ]
}
```

## Best Practices

### For CI/CD Pipelines

1. **Use short-lived branches** - Deploy from `main` for production
2. **Check logs during deployment** - Use `/api/pipeline/logs/:containerName`
3. **Test smoke tests** - Ensure application is fully ready before marking success
4. **Track history** - Monitor pipeline execution patterns with `/api/pipeline/history`

### For Recovery

1. **Start small** - Begin with `restart` strategy, upgrade to `rebuild` if needed
2. **Set appropriate intervals** - 3-5 seconds for most applications
3. **Monitor metrics** - Review SLI metrics regularly
4. **Act on recommendations** - Follow system suggestions for improvements
5. **Test before production** - Run failure injection in staging first

### For Monitoring

1. **Check reports regularly** - Use `/api/report/monitoring/:containerName`
2. **Monitor success rates** - Aim for >99% recovery success
3. **Track MTTR trends** - Degrading MTTR indicates issues
4. **Review recommendations** - System provides actionable insights
5. **Investigate frequent recoveries** - More than 5/hour needs investigation

## Next Steps

Once you're comfortable with the CI/CD and Recovery systems:

1. **Deploy from real GitHub repos** - Use your own applications
2. **Set up monitoring dashboards** - Visualize SLI metrics
3. **Create alerting rules** - Alert on low success rates or high MTTR
4. **Test at scale** - Deploy multiple containers with recovery
5. **Implement feedback loops** - Auto-scale based on recovery metrics
