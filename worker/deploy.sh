#!/bin/bash
# Deploy the GIF worker to Google Cloud Run
set -euo pipefail
SERVICE_NAME=${SERVICE_NAME:-gif-worker}
REGION=${REGION:-us-central1}
PROJECT=${PROJECT:-$(gcloud config get-value project)}

# Determine repo root (one level up from this script)
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

TAG=$(date +%Y%m%d%H%M%S)
IMAGE="gcr.io/${PROJECT}/${SERVICE_NAME}:$TAG"
# Ensure a buildx builder exists
docker buildx inspect default >/dev/null 2>&1 || docker buildx create --use
# Build a single-platform linux/amd64 image and load it into Docker
docker buildx build \
  --platform linux/amd64 \
  --load \
  -t "$IMAGE" \
  -f "$REPO_ROOT/worker/Dockerfile" \
  "$REPO_ROOT"
# Push the image to Container Registry (v2 manifest)
docker push "$IMAGE"

# Deploy to Cloud Run using the built image
gcloud run deploy "$SERVICE_NAME" \
  --project "$PROJECT" \
  --region "$REGION" \
  --image "$IMAGE" \
  --port 8080 \
  --env-vars-file "$REPO_ROOT/worker/env.yaml" \
  --allow-unauthenticated
