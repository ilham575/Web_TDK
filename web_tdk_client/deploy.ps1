#!/usr/bin/env pwsh
# Simple deployment script for web_tdk_client
# Usage: .\deploy.ps1

param(
    [string]$ProjectId = "tdk-proj-489111"
)

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deploy web_tdk_client to Firebase" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build React app
Write-Host "[1/2] Building React app..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Build failed" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Build successful" -ForegroundColor Green
Write-Host ""

# Step 2: Deploy to Firebase
Write-Host "[2/2] Deploying to Firebase Hosting..." -ForegroundColor Yellow
firebase deploy --project $ProjectId

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Deployment failed" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Deployment successful" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "========================================"
Write-Host ""
Write-Host "Your app is live at:" -ForegroundColor Cyan
Write-Host "https://tdk-proj-489111.web.app" -ForegroundColor White
