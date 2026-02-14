# Script for deploying to Firebase Functions
$PROJECT_ID = "tdk-proj-487218"

Write-Host "--- Starting Firebase Deployment ---" -ForegroundColor Cyan

# Check if firebase-tools is installed
if (!(Get-Command firebase -ErrorAction SilentlyContinue)) {
    Write-Host "Firebase CLI not found. Please install with: npm install -g firebase-tools" -ForegroundColor Red
    return
}

# Deploy
firebase deploy --only functions --project $PROJECT_ID

Write-Host "--- Deployment Complete! ---" -ForegroundColor Green
Write-Host "Remember to check DATABASE_URL in Google Cloud Console (Functions settings)" -ForegroundColor Yellow