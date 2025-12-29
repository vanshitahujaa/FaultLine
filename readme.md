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

## Scope

- Single-node deployment
- Manual failure injection
- Focused on clarity over scale
- Learning and demonstration system (not a customer-facing SaaS)

## License
MIT


## Status

🚧 **In Development**