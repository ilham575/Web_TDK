#!/usr/bin/env pwsh
# Simple deployment script for web_tdk_server
# Usage: .\deploy.ps1

param(
    [string]$Region = "asia-southeast1",
    [string]$ProjectId = "tdk-proj-489111",
    [string]$DbPasswordSecretName = "web-tdk-db-password",
    [string]$DbUser = "web_tdk_user"
)

$ServiceName = "web-tdk-server"
$ImageName = "gcr.io/$ProjectId/$ServiceName"
$JwtSecretName = "web-tdk-jwt-secret"
$DbInstanceName = "web-tdk-db"
$DbName = "web_tdk_db"
$CloudSqlConnection = "${ProjectId}:${Region}:${DbInstanceName}"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deploy web_tdk_server to Cloud Run" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

gcloud config set project $ProjectId | Out-Null

# Step 1: Build Docker image
Write-Host "[1/3] Building Docker image..." -ForegroundColor Yellow
docker build -t $ImageName . 2>&1 | ForEach-Object { if ($_ -match "error") { Write-Host $_ -ForegroundColor Red } else { Write-Host $_ } }

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Docker build failed" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Docker image built successfully" -ForegroundColor Green
Write-Host ""

# Step 2: Push to Google Container Registry
Write-Host "[2/3] Pushing image to Google Container Registry..." -ForegroundColor Yellow
docker push $ImageName 2>&1 | ForEach-Object { if ($_ -match "error|denied") { Write-Host $_ -ForegroundColor Red } else { Write-Host $_ } }

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Docker push failed" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Image pushed successfully" -ForegroundColor Green
Write-Host ""

# Build production env vars with the real Cloud SQL socket path.
$SecretExists = gcloud secrets describe $DbPasswordSecretName --project $ProjectId --format="value(name)"
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($SecretExists)) {
    Write-Host "[ERROR] Secret Manager secret not found: $DbPasswordSecretName" -ForegroundColor Red
    Write-Host "        Pass the correct secret id with -DbPasswordSecretName or create the secret first." -ForegroundColor Red
    exit 1
}

$DbPassword = gcloud secrets versions access latest --secret=$DbPasswordSecretName --project $ProjectId
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($DbPassword)) {
    Write-Host "[ERROR] Failed to read database password from Secret Manager ($DbPasswordSecretName)" -ForegroundColor Red
    exit 1
}

$DbPassword = $DbPassword.Trim()
$EncodedDbUser = [System.Uri]::EscapeDataString($DbUser)
$EncodedDbPassword = [System.Uri]::EscapeDataString($DbPassword)

@"
DATABASE_URL: "mysql+pymysql://${EncodedDbUser}:${EncodedDbPassword}@/${DbName}?unix_socket=/cloudsql/${CloudSqlConnection}"
ENV: "production"
DEBUG: "False"
JWT_COOKIE_SECURE: "true"
JWT_COOKIE_SAMESITE: "none"
FRONTEND_URL: "https://tdk-proj-489111.web.app"
CORS_ORIGINS: "https://tdk-proj-489111.web.app,https://tdk-proj-489111.firebaseapp.com"
"@ | Set-Content "env-prod.yaml"

# Ensure the Cloud Run runtime service account can read the JWT secret.
$ProjectNumber = gcloud projects describe $ProjectId --format="value(projectNumber)"
$ServiceAccount = "${ProjectNumber}-compute@developer.gserviceaccount.com"
gcloud secrets add-iam-policy-binding $JwtSecretName `
    --member="serviceAccount:$ServiceAccount" `
    --role="roles/secretmanager.secretAccessor" `
    --project $ProjectId 2>$null | Out-Null
gcloud projects add-iam-policy-binding $ProjectId `
    --member="serviceAccount:$ServiceAccount" `
    --role="roles/cloudsql.client" 2>$null | Out-Null

# Step 3: Deploy to Cloud Run
Write-Host "[3/3] Deploying to Cloud Run..." -ForegroundColor Yellow
gcloud run deploy $ServiceName `
    --image $ImageName `
    --platform managed `
    --region $Region `
    --allow-unauthenticated `
    --cpu 1 `
    --memory 512Mi `
    --min-instances 0 `
    --max-instances 2 `
    --timeout 300 `
    --env-vars-file env-prod.yaml `
    --set-secrets "JWT_SECRET_KEY=${JwtSecretName}:latest" `
    --set-cloudsql-instances $CloudSqlConnection `
    --project $ProjectId `
    --quiet

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Cloud Run deployment failed" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Deployment successful" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Service URL:" -ForegroundColor Cyan
Write-Host "https://web-tdk-server-449550769588.asia-southeast1.run.app" -ForegroundColor White
Write-Host "========================================"
