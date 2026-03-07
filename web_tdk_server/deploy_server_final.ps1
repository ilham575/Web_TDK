# ============================================================
# Deploy web_tdk_server to Google Cloud Run
# ============================================================

$PROJECT_ID   = "tdk-proj-489111"
$REGION       = "asia-southeast1"
$SERVICE_NAME = "web-tdk-server"
$IMAGE_NAME   = "gcr.io/$PROJECT_ID/$SERVICE_NAME"
$DB_INSTANCE  = "web-tdk-db"
$DB_NAME      = "web_tdk_db"
$DB_USER      = "web_tdk_user"

Write-Host "Setting project to $PROJECT_ID..." -ForegroundColor Cyan
gcloud config set project $PROJECT_ID

# Enable APIs
Write-Host "Enabling Cloud Run and Cloud Build APIs..." -ForegroundColor Yellow
gcloud services enable run.googleapis.com cloudbuild.googleapis.com

# Build & Push
Write-Host "Building and Pushing Docker Image..." -ForegroundColor Yellow
gcloud builds submit --tag $IMAGE_NAME .

if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed"
    exit 1
}

# Get connection name
$CLOUD_SQL_CONNECTION = "${PROJECT_ID}:${REGION}:${DB_INSTANCE}"

# Get DB Password from Secret
$DB_PASSWORD = gcloud secrets versions access latest --secret=web-tdk-db-password

# Write env-prod.yaml to avoid comma escaping issues with gcloud
@"
DATABASE_URL: "mysql+pymysql://${DB_USER}:${DB_PASSWORD}@/${DB_NAME}?unix_socket=/cloudsql/${CLOUD_SQL_CONNECTION}"
DEBUG: "False"
CORS_ORIGINS: "https://tdk-proj-489111.web.app,https://tdk-proj-489111.firebaseapp.com"
"@ | Set-Content "env-prod.yaml"

# Grant Secret Manager access to Cloud Run default SA (safe to run multiple times)
$PROJECT_NUMBER = gcloud projects describe $PROJECT_ID --format="value(projectNumber)"
$SA = "${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
gcloud secrets add-iam-policy-binding web-tdk-jwt-secret --member="serviceAccount:$SA" --role="roles/secretmanager.secretAccessor" --project=$PROJECT_ID 2>$null

# Deploy to Cloud Run
Write-Host "Deploying to Cloud Run..." -ForegroundColor Yellow
gcloud run deploy $SERVICE_NAME `
    --image $IMAGE_NAME `
    --platform managed `
    --region $REGION `
    --allow-unauthenticated `
    --min-instances 0 `
    --max-instances 2 `
    --memory 512Mi `
    --cpu 1 `
    --add-cloudsql-instances $CLOUD_SQL_CONNECTION `
    --env-vars-file env-prod.yaml `
    --set-secrets "JWT_SECRET_KEY=web-tdk-jwt-secret:latest"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Deployment failed. This might be due to missing IAM permissions for the newly created service account." -ForegroundColor Red
    Write-Host "Please check the GCP Console to ensure the Compute Engine service account has 'Cloud SQL Client' and 'Secret Manager Secret Accessor' roles." -ForegroundColor Red
} else {
    $SERVICE_URL = gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format "value(status.url)"
    Write-Host "Successfully Deployed!" -ForegroundColor Green
    Write-Host "Service URL: $SERVICE_URL"
}
