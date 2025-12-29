# FaultLine Frontend

A modern React dashboard for the FaultLine chaos engineering platform.

## Features

- 🎯 **Deploy Containers** - Simple form to deploy containerized applications
- 📦 **Container Management** - View and manage all running containers
- 💥 **Failure Injection** - Inject controlled failures (kill, latency, memory)
- 📊 **Recovery Visualization** - Real-time recovery timeline and metrics
- 🔄 **Live Updates** - Auto-refresh status every 2 seconds
- 🎨 **Dark Theme** - Professional dark UI with glassmorphism effects

## Architecture

```
frontend/
├── public/
│   └── index.html              # HTML template
├── src/
│   ├── components/
│   │   ├── Dashboard.js        # Main dashboard container
│   │   ├── DeploymentForm.js   # Container deployment form
│   │   ├── ContainersList.js   # Container list with status
│   │   ├── FailureInjector.js  # Failure injection controls
│   │   └── Timeline.js         # Recovery timeline visualization
│   ├── services/
│   │   └── api.js              # Backend API client (axios)
│   ├── styles/
│   │   ├── index.css           # Global styles
│   │   ├── dashboard.css       # Dashboard layout
│   │   ├── form.css            # Form components
│   │   ├── containers.css      # Container list
│   │   ├── failures.css        # Failure controls
│   │   └── timeline.css        # Timeline visualization
│   ├── App.js                  # Root component
│   └── index.js                # React entry point
├── package.json
├── Dockerfile
└── .env.example
```

## Quick Start

### Local Development

```bash
# Install dependencies
cd frontend
npm install

# Start development server
npm start
```

The app will open at `http://localhost:3000`

**Requirements**: Backend must be running on `http://localhost:3000/api`

### Docker

```bash
# Build image
docker build -t faultline-frontend .

# Run container
docker run -p 3001:3001 \
  -e REACT_APP_API_URL=http://localhost:3000/api \
  faultline-frontend
```

Access at `http://localhost:3001`

### Docker Compose

```bash
docker-compose up frontend backend
```

- Frontend: `http://localhost:3001`
- Backend: `http://localhost:3000`

## Components

### Dashboard
Main container component that orchestrates:
- Backend connectivity check
- Container list management
- Timeline display
- Error handling

### DeploymentForm
Form for deploying new containers:
- Image selection
- Container name input
- Success/error feedback
- Real-time validation

### ContainersList
Displays all containers with:
- Container name and image
- Current status (running, exited, etc.)
- Container details on expand
- Failure injection controls

### FailureInjector
Controls for injecting failures:
- Kill failure (💀) - Stop and auto-restart container
- Latency failure (⏱️) - Simulate network delays
- Memory failure (💾) - Limit memory allocation
- Optional delay (0-10000ms)

### Timeline
Visualization of recovery events:
- Total failures and recoveries count
- Recovery time metrics (in seconds)
- Event history with timestamps
- Status indicators (scheduled, executed, recovered)

## API Integration

All requests go through `services/api.js`:

```javascript
// Deployment
POST /api/deploy
{ image, containerName }

// Containers
GET /api/containers
GET /api/health/:containerName
GET /api/logs/:containerName

// Failures
POST /api/failures/kill
{ containerName, delay }

POST /api/failures/latency
{ containerName, latencyMs, duration }

POST /api/failures/memory
{ containerName, memoryLimit, duration }

// Timelines
GET /api/timeline/:containerName
GET /api/timelines
```

## Styling

Using vanilla CSS with:
- CSS Grid for layouts
- Flexbox for components
- CSS variables for colors
- Glassmorphism effects (backdrop blur)
- Smooth transitions and hover states

### Color Scheme

- **Dark**: #0f0f0f, #1a1a1a
- **Primary**: #0ea5e9 (sky blue)
- **Success**: #22c55e (emerald)
- **Danger**: #ef4444 (red)
- **Warning**: #f59e0b (amber)
- **Muted**: #999999, #666666

## Responsive Design

- Desktop (1200px+): 3-column grid layout
- Tablet (768-1199px): Flexible grid
- Mobile (<768px): Single column stack

## Environment Variables

Create `.env` file:

```
REACT_APP_API_URL=http://localhost:3000/api
```

## Performance

- Auto-refresh interval: 2 seconds (containers and timelines)
- Event polling: Stops when container deselected
- Backend health check: Every 10 seconds
- Graceful error handling and fallbacks

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Scripts

```bash
npm start          # Start development server
npm run build      # Build for production
npm test           # Run tests
npm run eject      # Eject from create-react-app
```

## Dependencies

- **react** - UI framework
- **react-dom** - DOM rendering
- **axios** - HTTP client
- **date-fns** - Date formatting

## Development

### Adding a New Component

1. Create file in `src/components/`
2. Import in parent component
3. Style with CSS in `src/styles/`
4. Test with backend running

### Adding a New API Endpoint

1. Add method in `src/services/api.js`
2. Call from component via `apiService`
3. Handle loading/error states

### Styling

- Create new CSS file in `src/styles/`
- Import in component or global `index.css`
- Use consistent color variables
- Test responsive design

## Troubleshooting

### "Backend unreachable" error
- Ensure backend is running on port 3000
- Check `REACT_APP_API_URL` environment variable
- Verify CORS headers on backend

### Docker build fails
- Ensure `npm install` works locally first
- Check Node.js version (18+ required)
- Verify all dependencies are in `package.json`

### Containers not showing
- Check backend `/api/containers` endpoint
- Verify Docker socket permissions
- Check backend logs for errors

## Next Steps

- Add real-time WebSocket updates
- Implement user authentication
- Add metrics dashboard
- Create deployment history
- Add logs viewer

## License

MIT
