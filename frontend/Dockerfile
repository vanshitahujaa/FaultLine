# FaultLine Frontend Docker Image
# Production React app with Nginx reverse proxy

# Build stage: Compile React app
FROM node:20-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code and public assets
COPY public ./public
COPY src ./src

# Build optimized production React app
RUN npm run build

# Production stage: Serve with Nginx
FROM nginx:alpine

WORKDIR /usr/share/nginx/html

# Copy Nginx configuration for React SPA routing
RUN echo 'server { \
    listen 3001; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
    \
    location /api { \
        proxy_pass http://backend:3000; \
        proxy_http_version 1.1; \
        proxy_set_header Connection ""; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Copy built React app from builder stage
COPY --from=builder /app/build ./

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001/ || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
