#!/bin/bash
# Deploy the GIF worker to Google Cloud Run
set -euo pipefail
SERVICE_NAME=${SERVICE_NAME:-gif-worker}
REGION=${REGION:-us-central1}
PROJECT=${PROJECT:-$(gcloud config get-value project)}

# Determine repo root (one level up from this script)
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Build and deploy using Cloud Run with the worker Dockerfile
gcloud run deploy "$SERVICE_NAME" \
  --project "$PROJECT" \
  --region "$REGION" \
  --source "$REPO_ROOT" \
  --dockerfile worker/Dockerfile \
  --env-vars-file worker/env.yaml \
  --allow-unauthenticated
