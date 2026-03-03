# ============================================================
# Deploy web_tdk_client to Firebase Hosting
# ============================================================

param(
    [string]$ApiUrl = ""
)

Set-Location $PSScriptRoot

# Check Firebase CLI
if (-not (Get-Command firebase -ErrorAction SilentlyContinue)) {
    Write-Error "Firebase CLI not found. Install with: npm install -g firebase-tools"
    exit 1
}

# Check npm
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Error "npm not found. Please install Node.js"
    exit 1
}

# Update .env.production if API URL provided
if ($ApiUrl -ne "") {
    Write-Host "--- Updating .env.production ---" -ForegroundColor Yellow
    Set-Content -Path ".env.production" -Value "REACT_APP_API_BASE_URL=$ApiUrl"
    Write-Host "REACT_APP_API_BASE_URL=$ApiUrl"
}

# Show current env
$currentEnv = Get-Content ".env.production" -ErrorAction SilentlyContinue
Write-Host "--- Current .env.production ---" -ForegroundColor Cyan
Write-Host $currentEnv
Write-Host ""

# Build React app
Write-Host "--- Building React app ---" -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed"
    exit 1
}

# Firebase login check
Write-Host "--- Checking Firebase login ---" -ForegroundColor Yellow
firebase login --no-localhost 2>$null

# Deploy
Write-Host "--- Deploying to Firebase Hosting ---" -ForegroundColor Yellow
firebase deploy --only hosting

if ($LASTEXITCODE -ne 0) {
    Write-Error "Deploy failed"
    exit 1
}

Write-Host ""
Write-Host "=== Deploy Success! ===" -ForegroundColor Green
Write-Host "Client URL: https://tdk-proj-489111.web.app" -ForegroundColor Green
