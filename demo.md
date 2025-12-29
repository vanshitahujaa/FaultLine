# FaultLine Golden Demo

> A reproducible chaos engineering workflow demonstrating container failure injection and recovery detection.

## Overview

This demo walks through the complete FaultLine workflow:
1. **Deploy** a production-like application (nginx)
2. **Inject** a controlled failure (kill container)
3. **Measure** how the system recovers
4. **Analyze** the recovery timeline

## Prerequisites

- FaultLine backend running: `http://localhost:3000`
- `curl` and `jq` installed
- Docker running

## Run the Demo

### Using the bash script (automated):
```bash
chmod +x scripts/demo.sh
./scripts/demo.sh
```

### Manual curl sequence (step-by-step):

#### Step 1: Deploy nginx
```bash
curl -X POST http://localhost:3000/api/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "image": "nginx:latest",
    "containerName": "demo-nginx"
  }'
```

**Expected Response** (201 Created):
```json
{
  "success": true,
  "message": "Container demo-nginx deployed successfully",
  "container": {
    "id": "abc123...",
    "name": "demo-nginx",
    "image": "nginx:latest"
  }
}
```

#### Step 2: Verify container health
```bash
curl http://localhost:3000/api/health/demo-nginx
```

**Expected Response**:
```json
{
  "success": true,
  "health": {
    "id": "abc123...",
    "name": "/demo-nginx",
    "state": "running",
    "running": true,
    "exitCode": 0
  }
}
```

#### Step 3: Inject kill failure
```bash
curl -X POST http://localhost:3000/api/failures/kill \
  -H "Content-Type: application/json" \
  -d '{
    "containerName": "demo-nginx"
  }'
```

**Expected Response** (202 Accepted):
```json
{
  "success": true,
  "failure": "kill",
  "container": "demo-nginx",
  "timestamp": "2025-12-29T16:45:30.123Z",
  "message": "Kill failure injected on demo-nginx"
}
```

**What happens next:**
- Docker's restart policy restarts the container
- FaultLine polls health every 2 seconds
- After 10 continuous seconds of health checks passing (≈2 polls), container is marked **RECOVERED**

#### Step 4: Fetch recovery timeline (after ~15-20 seconds)
```bash
curl http://localhost:3000/api/timeline/demo-nginx
```

**Expected Response** (with real recovery data):
```json
{
  "success": true,
  "timeline": {
    "container": "demo-nginx",
    "events": [
      {
        "timestamp": "2025-12-29T16:45:30.123Z",
        "type": "kill",
        "status": "scheduled",
        "metadata": {
          "failureTime": "2025-12-29T16:45:30.123Z"
        }
      },
      {
        "timestamp": "2025-12-29T16:45:30.234Z",
        "type": "kill",
        "status": "executed",
        "metadata": {
          "failureTime": "2025-12-29T16:45:30.123Z"
        }
      },
      {
        "timestamp": "2025-12-29T16:45:42.456Z",
        "type": "kill",
        "status": "recovered",
        "metadata": {
          "failureTime": "2025-12-29T16:45:30.123Z",
          "recoveryTime": "2025-12-29T16:45:42.456Z",
          "recoveryDurationMs": 12333
        }
      }
    ],
    "totalFailures": 1,
    "totalRecoveries": 1
  }
}
```

## Key Data Points

From the timeline, you can extract:

| Metric | Value | Meaning |
|--------|-------|---------|
| `failureTime` | 2025-12-29T16:45:30.123Z | When failure was injected |
| `recoveryTime` | 2025-12-29T16:45:42.456Z | When container became healthy again |
| `recoveryDurationMs` | 12333 | Time from failure to recovery (in milliseconds) |

## What's Being Measured

1. **Failure Injection** - Precise moment failure begins
2. **Health Detection** - Polling proves container is unresponsive
3. **Recovery Confirmation** - 10 continuous seconds of healthy status
4. **Duration Calculation** - Exact recovery time in milliseconds

## Persistence

All timelines are automatically persisted to `backend/data/timelines.json`:
- Survives server restarts
- Human-readable JSON format
- Can be loaded and analyzed later

## Next Steps

- Modify failure delay: `"delay": 5000` (5 second delay before injection)
- Try latency failure: `POST /api/failures/latency` with `latencyMs` and `duration`
- Deploy different images: `"image": "httpbin.org/image"` or your own app
- View all timelines: `GET /api/timelines`
