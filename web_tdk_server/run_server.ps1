#!/usr/bin/env pwsh

Write-Host "Starting Web TDK Server..." -ForegroundColor Green
Write-Host ""

# Change to script directory  
Set-Location $PSScriptRoot

# Check if virtual environment exists
if (Test-Path "venv") {
    Write-Host "Activating virtual environment..." -ForegroundColor Yellow
    & "venv\Scripts\Activate.ps1"
} elseif (Test-Path ".venv") {
    Write-Host "Activating virtual environment..." -ForegroundColor Yellow
    & ".venv\Scripts\Activate.ps1"
} else {
    Write-Host "No virtual environment found. Using global Python..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Installing/updating dependencies..." -ForegroundColor Blue
pip install -r requirements.txt

Write-Host ""
Write-Host "Starting FastAPI server..." -ForegroundColor Green
Write-Host "Server will be available at: http://localhost:8000" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

uvicorn main:app --reload --host 0.0.0.0 --port 8080