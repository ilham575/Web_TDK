# Deploying web_tdk_client to Google Cloud Run

This folder contains helper files to build the React app and deploy it to Google Cloud Run using Cloud Build.

Files added:
- `Dockerfile` - multi-stage build: builds React app and serves with nginx
- `nginx.conf` - nginx configuration for SPA fallback
- `cloudbuild.yaml` - Cloud Build pipeline to build image and deploy to Cloud Run
- `.gcloudignore` - files ignored for gcloud uploads

Quick manual deploy (local):

1. Build locally and test:

```powershell
cd web_tdk_client
npm ci
npm run build
# serve build locally (optional):
npx serve -s build -l 5000
# or build Docker image and run
docker build -t web-tdk-client:local .
docker run -p 8080:8080 web-tdk-client:local
```

2. Deploy with Cloud Build (recommended):

You can trigger Cloud Build with the included `cloudbuild.yaml`. It will:
- build Docker image
- push it to Container Registry
- deploy the image to Cloud Run (managed)

From the repository root run:

```powershell
gcloud builds submit --config web_tdk_client/cloudbuild.yaml --substitutions=_SERVICE_NAME="web-tdk-client",_REGION="us-central1"
```

You can change `_SERVICE_NAME` and `_REGION` as needed. Make sure you've run `gcloud auth login` and `gcloud config set project YOUR_PROJECT_ID`.

3. Manual Cloud Run deploy (if you prefer):

```powershell
# Build and push image
IMAGE=gcr.io/$(gcloud config get-value project)/web-tdk-client:latest
docker build -t $IMAGE .
docker push $IMAGE

# Deploy to Cloud Run
gcloud run deploy web-tdk-client --image $IMAGE --platform managed --region us-central1 --allow-unauthenticated
```

Notes:
- Ensure the GCP project has Cloud Run API enabled and appropriate IAM permissions for Cloud Build to deploy.
- For private backends, configure environment variables and VPC connectors for Cloud Run as needed.
