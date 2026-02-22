@echo off
echo =============================================
echo  CSCP Situational AI — Backend Startup
echo =============================================
echo.
echo [1/2] Installing Python dependencies...
py -m pip install fastapi "uvicorn[standard]" ebooklib beautifulsoup4 httpx python-dotenv lxml
echo.
echo [2/2] Starting API server on http://localhost:8000 ...
echo        (Keep this window open while using Situational AI)
echo.
py -m uvicorn main:app --reload --port 8000
pause
