#!/usr/bin/env pwsh
# Simple deployment script for web_tdk_server
# Usage: .\deploy.ps1

param(
    [string]$Region = "asia-southeast1",
    [string]$ProjectId = "tdk-proj-489111"
)

$ServiceName = "web-tdk-server"
$ImageName = "gcr.io/$ProjectId/$ServiceName"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deploy web_tdk_server to Cloud Run" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

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
    --set-cloudsql-instances "${ProjectId}:${Region}:web-tdk-db" `
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
