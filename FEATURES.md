# FaultLine - Complete Feature Overview

## 🎯 What This App Does

**FaultLine** is a comprehensive **Chaos Engineering Platform** for Docker that enables you to:
- Deploy containers from Docker Hub images or GitHub repositories
- Inject controlled failures (kill, latency, memory pressure) to test resilience
- Monitor container health in real-time
- View recovery timelines and metrics
- Stream live logs from containers

---

## 🏗️ Architecture

### Backend (Node.js Express)
**Port: 3000**

**Core Services:**
1. **Docker Service** - Container management (create, start, kill, health checks, logs)
2. **Failure Service** - Failure injection with recovery tracking and timeline persistence
3. **Persistence Service** - JSON-based timeline storage for failure history

**API Endpoints:**
- `POST /api/deploy` - Deploy new container from image
- `GET /api/containers` - List all running containers
- `GET /api/health/:containerName` - Get container health status
- `GET /api/logs/:containerName` - Stream container logs
- `POST /api/failures/kill` - Inject kill failure
- `POST /api/failures/latency` - Inject latency failure
- `POST /api/failures/memory` - Inject memory pressure failure
- `GET /api/timeline/:containerName` - Get failure/recovery timeline
- `GET /api/timelines` - Get all timelines

### Frontend (React 18)
**Port: 3001**

---

## 🎨 Frontend Features (4+2 Layout)

### Top Row (4 Columns)

**1. Deploy Panel**
- Toggle between Docker Image mode and GitHub Repository mode
- Docker Image: Enter image name (e.g., `nginx:latest`) and container name
- GitHub: Enter repo link, branch, and container name
- Auto-pulls images from Docker Hub before deploying
- Success/error notifications

**2. Containers List**
- Real-time list of all running containers
- Click to select a container
- Shows deployment status
- Auto-refreshes with "Refresh List" button

**3. Chaos Controls (Failure Injector)**
- **Kill Failure** 💥: Stop container instantly or with delay (0-10,000ms)
- **Latency Failure** 🐢: Add network delay (0-10,000ms) for specified duration (0-600s)
- **Memory Pressure** 🧠: Limit memory (64MB-1GB) for specified duration
- Real-time slider controls with visual feedback
- Color-coded buttons (red/orange/purple) for each failure type

**4. Health Status Panel**
- Container running state (✅ Running / ❌ Stopped)
- Exit code
- Container ID (truncated)
- Start time

### Bottom Row (2 Columns)

**5. Logs Viewer**
- Real-time container logs (last 100 lines)
- Auto-refreshes every 5 seconds
- Manual refresh button
- Line counter
- Monospace formatting with syntax coloring

**6. Recovery Timeline**
- Failure event history with timestamps
- Recovery duration metrics
- Total failures & recoveries counter
- Visual event timeline
- Recovery metrics summary

### Header
- App title with glow effect: **🔥 FaultLine**
- Backend connection status badge (✅ Connected / ❌ Disconnected)
- Auto-checks backend health every 10 seconds

---

## 🧪 Testing Workflow

### Example 1: Kill Failure
```
1. Deploy: nginx:latest as "web-server"
2. Watch logs and health status
3. Select "web-server" in containers list
4. Click "Inject Kill" in Chaos Controls
5. See container stop in Health panel
6. View recovery timeline showing failure + restart
```

### Example 2: Latency Testing
```
1. Deploy: ubuntu:22.04 as "slow-app"
2. Select container
3. Set latency to 5000ms (5 seconds)
4. Set duration to 120 seconds
5. Monitor timeline for latency event
6. Watch auto-recovery after 120s
```

### Example 3: Memory Pressure
```
1. Deploy: python:3.11 as "heavy-compute"
2. Select container
3. Set memory limit to 256MB
4. Inject memory failure
5. Container will experience memory pressure
6. Timeline shows pressure event and recovery
```

---

## 📊 Key Metrics Tracked

For each container:
- **Failure Events**: Timestamp, type (kill/latency/memory), duration
- **Recovery Events**: When container returns to healthy state
- **Recovery Duration**: Time from failure to recovery
- **Total Counts**: Number of failures injected vs. recoveries

---

## 💻 Technologies

**Backend:**
- Node.js 18 + Express.js
- Dockerode (Docker API client)
- JSON-based persistence
- Real-time health polling

**Frontend:**
- React 18 (ES6+)
- Axios (HTTP client)
- Vanilla CSS3 (glassmorphism, gradients, animations)
- Responsive grid layouts

**Infrastructure:**
- Docker & Docker Compose
- Alpine Linux base images
- CORS-enabled API communication

---

## 🚀 How to Use

### 1. Start Services
```bash
# Terminal 1: Backend
cd backend && npm start

# Terminal 2: Frontend
cd frontend && PORT=3001 BROWSER=none npm start

# Ensure Docker is running
open /Applications/Docker.app
```

### 2. Access Dashboard
```
http://localhost:3001
```

### 3. Deploy a Container
- Select Docker Image tab
- Enter image: `nginx:latest`
- Enter name: `my-web`
- Click "Deploy from Image"

### 4. Monitor & Inject Failures
- Select container from list
- Watch logs and health status
- Use Chaos Controls to inject failures
- View timeline of events

### 5. GitHub Deployment (Coming Soon)
- Switch to "🐙 GitHub Repository" mode
- Enter repo: `user/repo` or `https://github.com/user/repo`
- Enter branch (default: main)
- Enter container name
- Platform will clone → build Dockerfile → deploy

---

## 📈 Features Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Docker Image Deployment | ✅ Complete | Pull from Docker Hub |
| Container Management | ✅ Complete | List, health checks, logs |
| Kill Failure Injection | ✅ Complete | Configurable delay |
| Latency Failure Injection | ✅ Complete | 0-10,000ms with duration |
| Memory Pressure Injection | ✅ Complete | 64MB-1GB limits |
| Recovery Tracking | ✅ Complete | Millisecond precision |
| Logs Viewer | ✅ Complete | Real-time with refresh |
| Timeline Visualization | ✅ Complete | Event history & metrics |
| GitHub Deployment | 🔄 Planned | Mode selector UI ready |
| Docker Compose | ✅ Ready | Full orchestration setup |

---

## 🔧 Environment

**Ports:**
- Backend: `3000`
- Frontend: `3001`

**Services:**
- Both running locally and communicating via HTTP
- CORS enabled for cross-origin requests
- Health checks every 10s (frontend) and 3s (containers)

**Persistence:**
- Timelines stored in `backend/data/timelines.json`
- Survives server restarts
- JSON format for easy inspection

---

## 📝 Next Steps (Optional Enhancements)

1. **GitHub Deployment**: Implement clone → build → push → deploy workflow
2. **Advanced Chaos**: Network partition, CPU throttling, disk I/O stress
3. **Metrics Export**: Prometheus metrics, CloudWatch integration
4. **Multi-host**: Deploy to multiple Docker hosts
5. **Scenario Recording**: Record and replay failure scenarios
6. **Custom Dashboards**: Build custom metric dashboards

---

**Made with 💚 for Chaos Engineers**
