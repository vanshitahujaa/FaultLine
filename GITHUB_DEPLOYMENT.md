# GitHub Deployment Feature - Complete Implementation

## ✅ What We Built

Full end-to-end GitHub deployment workflow that:
1. **Clones** the GitHub repository (with branch support)
2. **Detects** the Dockerfile
3. **Builds** the Docker image from the Dockerfile
4. **Deploys** the built image as a container
5. **Tracks** the deployment in the timeline

---

## 📋 Backend Implementation

### New Service: `github.service.js`
**Location**: `backend/src/services/github.service.js`

**Key Methods:**
- `normalizeRepoUrl(repoInput)` - Converts various URL formats to standard git URL
  - Supports: `user/repo`, `github.com/user/repo`, `https://github.com/user/repo`
  - Automatically adds `.git` if needed

- `cloneRepository(repoUrl, branch)` - Clones the repo with depth=1 (efficient)
  - Uses `simple-git` library for git operations
  - Clones to `/tmp/faultline-repos/{uuid}/`
  - Returns repo path and unique ID

- `checkDockerfile(repoPath)` - Verifies Dockerfile exists
  - Checks for both `Dockerfile` and `dockerfile`
  - Returns file path and status

- `buildImage(repoPath, imageName, imageTag)` - Builds Docker image
  - Runs `docker build` from repository root
  - Tags image as `imageName:imageTag`
  - 5-minute timeout for builds
  - Captures build logs for debugging

- `deployFromGitHub(repoUrl, containerName, branch)` - Complete workflow
  - Orchestrates: clone → check → build → return built image name
  - Returns image name to be deployed
  - Proper error handling at each step

### New Route: `POST /api/deploy-from-github`
**Location**: `backend/src/routes/deploy.routes.js`

**Request Body:**
```json
{
  "repoUrl": "user/repo or https://github.com/user/repo",
  "containerName": "my-container",
  "branch": "main"  // optional, defaults to 'main'
}
```

**Response (202 Accepted):**
```json
{
  "status": "processing",
  "message": "Starting GitHub deployment workflow...",
  "steps": ["cloning", "detecting", "building", "deploying"]
}
```

**Background Processing:**
- Request returns immediately (202 status)
- Build happens asynchronously
- Container appears in list once ready
- Timeline tracks deployment event

### Enhanced Failure Service
**New Method**: `recordGitHubDeployment(containerName, deploymentData)`

Records deployment metadata:
- Repository URL
- Branch
- Built image name
- Build log
- Timestamp

---

## 🎨 Frontend Implementation

### Updated: `DeploymentForm.js`
**New Features:**
- Mode selector: 🐳 Docker Image vs 🐙 GitHub Repository
- GitHub mode inputs:
  - Repository URL field
  - Branch selector (defaults to `main`)
  - Container name
- Real-time build status indicator
- Different messaging for image vs GitHub deployment

### Updated: `api.js`
**New Method**: `deployFromGitHub(repoUrl, containerName, branch)`
- Increased timeout to 10 minutes (for image builds)
- Calls `POST /api/deploy-from-github`

---

## 🧪 How to Test GitHub Deployment

### Test Repository 1: Simple Nginx
```
Repository: https://github.com/docker-library/nginx
Branch: master
Container Name: test-nginx-github
```

**Expected Result:**
- Container deployed with Nginx
- Can be killed and monitored
- Logs viewable in dashboard
- Failures can be injected

### Test Repository 2: Python Flask App
```
Repository: https://github.com/pallets/flask
Branch: main  
Container Name: flask-demo
```

**Or create your own:**

1. Create a simple repo with Dockerfile:
```dockerfile
FROM ubuntu:22.04
RUN apt-get update && apt-get install -y curl
ENTRYPOINT ["/bin/bash"]
```

2. Test via dashboard:
   - Go to http://localhost:3001
   - Switch to "🐙 GitHub Repository" tab
   - Enter repo URL: `yourusername/yourrepo`
   - Enter container name
   - Click "Deploy from GitHub"
   - Wait for build to complete
   - Once ready, test features:
     - ✅ View logs
     - ✅ Check health
     - ✅ Inject kill failure → see recovery
     - ✅ Inject latency → see timeline update
     - ✅ View build log in timeline

---

## 📊 Complete Feature List

### ✅ Fully Implemented Features

**Deployment:**
- Docker Hub image pull & deploy
- GitHub repository clone & build & deploy
- Container name conflict detection
- Build logging with error capture

**Monitoring:**
- Real-time container health (running/stopped)
- Live container logs with auto-refresh
- Container list with selection
- Exit codes and timestamps

**Chaos Engineering:**
- Kill failure (instant or delayed)
- Latency failure (0-10s with configurable duration)
- Memory pressure (64MB-1GB limits)
- All with visual sliders and color coding

**Timeline & Recovery:**
- Failure event tracking
- Recovery time metrics
- Total failure/recovery counters
- Deployment event logging
- Build log persistence
- Millisecond precision timestamps

---

## 🔍 Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (React 3001)                  │
│  Deployment Form | Containers | Chaos Controls | Logs   │
└────────────────────┬──────────────────────────────────────┘
                     │ HTTP/CORS
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Backend (Express 3000)                       │
├──────────────────────────────────────────────────────────┤
│  ▪ GitHub Service (clone + build)                        │
│  ▪ Docker Service (create + start + health + logs)       │
│  ▪ Failure Service (inject + track recovery)             │
│  ▪ Persistence Service (JSON timeline storage)           │
└────────────────────┬──────────────────────────────────────┘
                     │ Docker API
                     ▼
         ┌───────────────────────┐
         │   Docker Daemon       │
         │ (Containers + Images) │
         └───────────────────────┘
```

---

## 🚀 Testing Workflow Example

### Scenario: Deploy Flask app, inject failure, view recovery

```bash
# Step 1: Open dashboard
http://localhost:3001

# Step 2: Deploy from GitHub
Mode: 🐙 GitHub Repository
Repo: pallets/flask
Branch: main
Container Name: flask-test
→ Click "Deploy from GitHub"

# Step 3: Wait for build (shows "🔄 Building image...")
# Build happens in background
# When done, container appears in list

# Step 4: Select container from list
Click: flask-test

# Step 5: Monitor and inject failures
- View logs (real-time Flask output)
- Check health (running/stopped)
- View build log in timeline

# Step 6: Inject kill failure
Chaos Controls → 💥 Kill Container → "Inject Kill"
- Container stops
- Health shows ❌ Stopped
- Timeline records failure
- Auto-restart (on-failure policy)
- Timeline shows recovery

# Step 7: View complete timeline
See:
- github-deployment event (with build log)
- kill failure event
- recovery event with duration
```

---

## 🐳 Dockerization Notes

The deployed containers work perfectly with all features because:

1. **Health Checks**: `docker inspect` works on any container
2. **Logs**: Docker's standard stdout/stderr captured for any image
3. **Failure Injection**: Kill/restart works on any running container
4. **Recovery Tracking**: Auto-restart policy detects when container restarts
5. **Build Logs**: Persisted for inspection in timeline

---

## ⚙️ Configuration

**Backend Environment:**
```env
NODE_ENV=production
PORT=3000
DOCKER_HOST=unix:///var/run/docker.sock  # Default, no change needed
```

**Repository Cloning:**
- Base directory: `/tmp/faultline-repos/`
- Clone depth: 1 (efficient)
- Cleanup: Commented out (keep for debugging)

**Image Tagging:**
- Format: `faultline-{containerName}:latest`
- Prevents conflicts with existing images

---

## 🔐 Security Considerations

**Current:**
- ✅ Container name conflict prevention
- ✅ Branch validation
- ✅ Build timeout (5 min)

**Future Enhancements:**
- Private repo support (SSH keys)
- Build log sanitization
- Rate limiting on builds
- Quota enforcement
- Image scanning

---

## 📝 Troubleshooting

**"No Dockerfile found"**
- Repo must have Dockerfile in root
- Check spelling (case-sensitive on Linux)

**"Build timeout"**
- Docker image too large or slow to build
- Increase timeout in `github.service.js`

**Container doesn't appear**
- Check backend logs: `tail -f /tmp/backend.log`
- Image build may still be processing
- Refresh containers list

**Can't inject failures on GitHub-deployed container**
- Should work identically to any other container
- Check container is running: `docker ps`
- Verify health status in dashboard

---

**GitHub deployment is now fully functional! 🚀**
