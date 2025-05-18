#!/bin/bash
# Deploy the GIF worker to Google Cloud Run
set -euo pipefail

gcloud run deploy gif-worker \
  --project diffusion-453104 \
  --region us-central1 \
  --image gcr.io/diffusion-453104/gif-worker \
  --env-vars-file worker/env.yaml
