#  Faultline

> A production-focused platform that deploys applications, intentionally injects failures, and visualizes how systems recover in real time.

---

## Purpose

Most developers learn how to build features. **Faultline** is built to study how systems behave when things break. This project demonstrates deployment, observability, failure handling, and recovery using real infrastructure primitives.

## What It Does

- ✅ Deploys applications from GitHub repositories
- 🐳 Runs applications in Docker containers
- 📊 Monitors health, logs, and resource usage
- 💥 Injects controlled failures (crash, latency, memory)
- 📈 Measures and visualizes recovery behavior

## How It Works

- **Failure Triggering**: Intentional container kills via API
- **Health Detection**: Polls container status every 2 seconds
- **Recovery Definition**: 10 continuous seconds of healthy status = RECOVERED
- **Metrics Captured**: failure_time, recovery_time, recovery_duration (milliseconds)
- **Data Persistence**: Timelines saved to JSON, survive server restarts
- **Guardrails**: Prevents duplicate container names (409 Conflict)

## System Architecture

Faultline follows a **control-plane + runtime architecture**:

```
User
  |
  v
Frontend (React + TS)
  |
  v
Backend Control Plane (Express API)
  |
  +-----------------------------+
  |                             |
  v                             v
CI/CD Pipeline            Failure Injection Engine
(GitHub Actions)          (Kill / Latency / Memory)
  |
  v
Docker Runtime (Containers)
  |
  v
Target Application
  |
  v
Health Checks + Metrics + Logs
  |
  v
Backend → Frontend Dashboard
```

### Component Details

| Component | Purpose |
|-----------|---------|
| **Frontend** | React dashboard for control and visualization |
| **Backend** | Express-based control plane orchestrating deployments and failures |
| **CI/CD** | Automated build and deploy using GitHub Actions |
| **Runtime** | Docker containers executing target applications |
| **Observability** | Health checks, metrics, logs, recovery timelines |

## Tech Stack

- **Frontend**: React, TypeScript
- **Backend**: Node.js, Express
- **Containerization**: Docker
- **CI/CD**: GitHub Actions

## Project Structure

```
FaultLine/
│
├── backend/
│   ├── src/
│   │   ├── app.js
│   │   ├── server.js
│   │   ├── routes/
│   │   │   └── deploy.routes.js
│   │   ├── services/
│   │   │   ├── docker.service.js
│   │   │   └── failure.service.js
│   │   └── utils/
│   │       └── logger.js
│   │
│   ├── package.json
│   └── Dockerfile
│
├── frontend/          (coming soon)
│
├── README.md
└── LICENSE
```

## V1 Capabilities

- ✨ Deploy a Dockerized app
- 🏥 Track container health
- 💀 Kill container manually
- 🔄 Auto-restart container
- 📊 Show recovery timeline

## Scope

- Single-node deployment
- Manual failure injection
- Focused on clarity over scale
- Learning and demonstration system (not a customer-facing SaaS)

## License

MIT

## Status

🚧 **In Development**