#!/bin/bash

# FaultLine Golden Demo
# =====================
# This script demonstrates the complete FaultLine workflow:
# 1. Deploy nginx container
# 2. Inject a kill failure
# 3. Measure recovery time
# 4. Fetch the recovery timeline

set -e

API_BASE="http://localhost:3000/api"
CONTAINER_NAME="demo-nginx"
IMAGE="nginx:latest"

echo "🚀 FaultLine Golden Demo"
echo "========================"
echo ""

# Step 1: Deploy Container
echo "📦 Step 1: Deploying nginx container..."
DEPLOY_RESPONSE=$(curl -s -X POST "$API_BASE/deploy" \
  -H "Content-Type: application/json" \
  -d "{\"image\": \"$IMAGE\", \"containerName\": \"$CONTAINER_NAME\"}")

echo "$DEPLOY_RESPONSE" | jq .

DEPLOY_SUCCESS=$(echo "$DEPLOY_RESPONSE" | jq -r '.success // false')
if [ "$DEPLOY_SUCCESS" != "true" ]; then
  echo "❌ Deployment failed"
  exit 1
fi

echo "✅ Container deployed"
echo ""

# Step 2: Wait for container to be healthy
echo "⏳ Step 2: Waiting for container to reach healthy state..."
sleep 3

HEALTH=$(curl -s -X GET "$API_BASE/health/$CONTAINER_NAME")
echo "$HEALTH" | jq .

echo "✅ Container is healthy"
echo ""

# Step 3: Inject kill failure
echo "💥 Step 3: Injecting kill failure..."
FAILURE_RESPONSE=$(curl -s -X POST "$API_BASE/failures/kill" \
  -H "Content-Type: application/json" \
  -d "{\"containerName\": \"$CONTAINER_NAME\"}")

echo "$FAILURE_RESPONSE" | jq .

FAILURE_TIMESTAMP=$(echo "$FAILURE_RESPONSE" | jq -r '.timestamp')
echo "✅ Kill failure injected at $FAILURE_TIMESTAMP"
echo ""

# Step 4: Wait for Docker to auto-restart and measure recovery
echo "🔄 Step 4: Waiting for recovery (this may take ~10-15 seconds)..."
echo "   Docker auto-restarts the container due to RestartPolicy"
echo "   FaultLine polls health every 2 seconds"
echo "   Recovery = 10 continuous seconds of healthy status"
echo ""

# Wait for recovery to complete
RECOVERY_TIMEOUT=30
ELAPSED=0

while [ $ELAPSED -lt $RECOVERY_TIMEOUT ]; do
  TIMELINE=$(curl -s -X GET "$API_BASE/timeline/$CONTAINER_NAME")
  RECOVERED=$(echo "$TIMELINE" | jq '.timeline.events[] | select(.status=="recovered") | .metadata.recoveryDurationMs' | head -1)
  
  if [ ! -z "$RECOVERED" ]; then
    echo "✅ Recovery detected!"
    echo ""
    echo "📊 Step 5: Fetching recovery timeline..."
    echo "$TIMELINE" | jq .
    echo ""
    echo "🎉 Demo Complete!"
    echo ""
    echo "Key Metrics:"
    echo "  - Recovery Time: ${RECOVERED}ms"
    echo "  - Timestamp: $(echo "$TIMELINE" | jq -r '.timeline.events[-1].metadata.recoveryTime')"
    exit 0
  fi
  
  echo "   Waiting... (${ELAPSED}s/${RECOVERY_TIMEOUT}s)"
  sleep 2
  ELAPSED=$((ELAPSED + 2))
done

echo "⚠️  Recovery detection timed out (container may still be restarting)"
echo "   Fetching current timeline anyway:"
TIMELINE=$(curl -s -X GET "$API_BASE/timeline/$CONTAINER_NAME")
echo "$TIMELINE" | jq .
