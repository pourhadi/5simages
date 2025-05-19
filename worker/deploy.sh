#!/bin/bash
# Deploy the GIF worker to Google Cloud Run
set -euo pipefail
SERVICE_NAME=${SERVICE_NAME:-gif-worker}
REGION=${REGION:-us-central1}
PROJECT=${PROJECT:-$(gcloud config get-value project)}

# Build and deploy using Cloud Run's source deployment

gcloud run deploy "$SERVICE_NAME" \
  --project "$PROJECT" \
  --region "$REGION" \
  --source . \
  --env-vars-file env.yaml \
  --allow-unauthenticated
