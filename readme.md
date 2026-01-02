# 🔥 FaultLine - Chaos Engineering Platform

A production-focused platform that deploys applications, intentionally injects failures, and visualizes how systems recover in real time.

## What is FaultLine?

FaultLine is a comprehensive **Chaos Engineering Platform** for Docker that enables you to:
- ✅ Deploy containers from Docker Hub images or GitHub repositories
- 💥 Inject controlled failures (crash, latency, memory pressure) to test resilience  
- 📊 Monitor container health in real-time
- 📈 View recovery timelines and metrics
- 📝 Stream live container logs

## Features

### 🚀 Deployment
- **Docker Image Deployment** - Deploy from any Docker Hub image with one click
- **GitHub Deployment** - Deploy directly from GitHub repositories with automatic Dockerfile generation
- **Smart Dockerfile Generation** - Automatically detects project type (Node.js, Python, Go, etc) and generates production-ready Dockerfiles

### 💥 Failure Injection
- **Kill Failure** - Instantly stop containers to test auto-restart mechanisms
- **Latency Failure** - Inject network delays to simulate slow connections
- **Memory Pressure** - Limit container memory to test performance under constraints

### 📊 Real-Time Monitoring
- **Live Dashboard** - Real-time container status, health checks, and logs
- **Recovery Timeline** - Track failure events and measure recovery duration
- **Deployment Status Tracking** - Monitor build progress for GitHub deployments
- **Container Logs** - Stream logs with auto-refresh

### 🔄 Data Persistence
- JSON-based storage - No database required
- Survives server restarts
- Human-readable format

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, JavaScript, Axios, CSS3 |
| **Backend** | Node.js, Express.js |
| **Runtime** | Docker, Alpine Linux |
| **Infrastructure** | Docker Compose |

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Node.js 18+ (for development)

### Installation

```bash
# Clone the repository
git clone https://github.com/vanshitahujaa/FaultLine.git
cd FaultLine

# Install dependencies
npm install --prefix backend
npm install --prefix frontend
```

### Running Locally

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

Backend runs on: http://localhost:3000

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

Frontend runs on: http://localhost:3001

### Using Docker Compose

```bash
docker-compose up
```

This starts both backend and frontend in containers.

## Usage Guide

### 1. Deploy a Container

#### From Docker Hub Image
1. Go to Dashboard → Deploy Panel
2. Select "🐳 Docker Image" tab
3. Enter:
   - Container Image: `nginx:latest` (or any image)
   - Container Name: `my-nginx`
4. Click "Deploy from Image"

#### From GitHub Repository
1. Go to Dashboard → Deploy Panel
2. Select "🐙 GitHub Repository" tab
3. Enter:
   - GitHub Repository: `username/repo-name`
   - Branch: `main`
   - Container Name: `my-app`
4. Click "Deploy from GitHub"

**Note:** If the repository doesn't have a Dockerfile, FaultLine will auto-generate one!

### 2. Monitor Container

1. Select your container from the "Containers List" panel
2. View:
   - **Health Status** - Running state and exit codes
   - **Logs** - Last 100 lines of container output
   - **Timeline** - Historical events and recovery metrics

### 3. Inject Failures

With a container selected:

#### Kill Failure
- Click "Inject Kill" in Chaos Controls
- Set optional delay (0-10,000ms)
- Container will be stopped and auto-restart

#### Latency Failure
- Click "Inject Latency"
- Set latency (ms) and duration (seconds)
- Network delays will be simulated

#### Memory Pressure
- Click "Inject Memory Pressure"
- Set memory limit and duration
- Container memory will be constrained

### 4. View Recovery Metrics

After injecting a failure:
- **Timeline Panel** shows all events
- **Recovery Duration** - Time to become healthy
- **Event History** - Detailed timestamps for each event

## API Endpoints

### Deployment
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/deploy` | Deploy from Docker image |
| POST | `/api/deploy-from-github` | Deploy from GitHub repo |
| GET | `/api/deployment-status/:containerName` | Check deployment progress |

### Containers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/containers` | List all containers |
| GET | `/api/health/:containerName` | Get container health |
| GET | `/api/logs/:containerName` | Get container logs |

### Failures & Recovery
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/failures/kill` | Inject kill failure |
| POST | `/api/failures/latency` | Inject latency |
| POST | `/api/failures/memory` | Inject memory pressure |
| GET | `/api/timeline/:containerName` | Get recovery timeline |
| GET | `/api/timelines` | Get all timelines |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/ping` | Backend health check |

## Project Structure

```
FaultLine/
├── backend/
│   ├── src/
│   │   ├── app.js
│   │   ├── server.js
│   │   ├── routes/
│   │   │   ├── deploy.routes.js
│   │   │   └── pipeline.routes.js
│   │   └── services/
│   │       ├── docker.service.js
│   │       ├── failure.service.js
│   │       ├── github.service.js
│   │       ├── deployment.service.js
│   │       ├── dockerfile.generator.js
│   │       ├── recovery.service.js
│   │       └── persistence.service.js
│   ├── package.json
│   ├── Dockerfile
│   └── data/
│       └── timelines.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.js
│   │   │   ├── DeploymentForm.js
│   │   │   ├── ContainersList.js
│   │   │   ├── FailureInjector.js
│   │   │   └── Timeline.js
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── styles/
│   │   │   └── *.css
│   │   ├── App.js
│   │   └── index.js
│   ├── package.json
│   ├── Dockerfile
│   └── public/
│       └── index.html
│
└── docker-compose.yml
```

## Troubleshooting

### Docker Not Accessible
Ensure Docker daemon is running:
```bash
docker ps
```

### Port Already in Use
Change ports in docker-compose.yml or use:
```bash
lsof -i :3000
kill -9 <PID>
```

### Deployment Fails
1. Check backend logs for detailed error messages
2. Ensure Docker has access to pull images
3. For GitHub deployments, verify the Dockerfile exists or is auto-generated

### Container Crashes After Deployment
1. Check container logs in the Timeline panel
2. Verify the Docker image runs correctly standalone

## License

MIT License - see LICENSE file for details

## Author

Built with 🔥 by [vanshitahujaa](https://github.com/vanshitahujaa)

---

**Happy Chaos Engineering! 🚀**
