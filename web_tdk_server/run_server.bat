@echo off
echo Starting Web TDK Server...
echo.

cd /d %~dp0

REM Check if virtual environment exists
if exist venv (
    echo Activating virtual environment...
    call venv\Scripts\activate
) else if exist .venv (
    echo Activating virtual environment...
    call .venv\Scripts\activate
) else (
    echo No virtual environment found. Using global Python...
)

echo.
echo Installing/updating dependencies...
pip install -r requirements.txt

echo.
echo Starting FastAPI server...
echo Server will be available at: http://localhost:8000
echo Press Ctrl+C to stop the server
echo.

uvicorn main:app --reload --host 0.0.0.0 --port 8000

pause