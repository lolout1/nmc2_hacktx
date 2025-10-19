@echo off
echo ================================================
echo AI Assistant Diagnostic
echo ================================================
echo.

cd /d "%~dp0"

echo [1] Checking .env file...
if exist .env (
    echo ✓ .env file exists
    findstr "OPENAI_API_KEY" .env >nul
    if %errorlevel% equ 0 (
        echo ✓ OPENAI_API_KEY found in .env
    ) else (
        echo ❌ OPENAI_API_KEY not found in .env
        echo.
        echo Create .env file with:
        echo OPENAI_API_KEY=your_key_here
        pause
        exit /b 1
    )
) else (
    echo ❌ .env file not found
    echo.
    echo Create .env file with:
    echo OPENAI_API_KEY=your_key_here
    pause
    exit /b 1
)

echo.
echo [2] Checking Python dependencies...
python -c "import openai" 2>nul
if %errorlevel% neq 0 (
    echo ❌ openai not installed
    echo   Run: pip install openai
    goto :install_deps
)
echo ✓ openai installed

python -c "import pandas" 2>nul
if %errorlevel% neq 0 (
    echo ❌ pandas not installed
    goto :install_deps
)
echo ✓ pandas installed

python -c "from dotenv import load_dotenv" 2>nul
if %errorlevel% neq 0 (
    echo ❌ python-dotenv not installed
    goto :install_deps
)
echo ✓ python-dotenv installed

python -c "from sentence_transformers import SentenceTransformer" 2>nul
if %errorlevel% neq 0 (
    echo ❌ sentence-transformers not installed
    echo.
    echo This is REQUIRED for the RAG system!
    goto :install_deps
)
echo ✓ sentence-transformers installed

echo.
echo [3] Checking session cache...
if exist .openf1_cache\session_9161_laps.csv (
    echo ✓ Session 9161 cache found
) else (
    echo ⚠️  Session 9161 not cached
    echo   Load Singapore GP 2023 in browser first
)

echo.
echo [4] Testing Python script...
cd montecarlo
python openai_rag_v2.py 9161 1 summary
if %errorlevel% neq 0 (
    echo.
    echo ❌ Python script failed
    echo Check the error above
    pause
    exit /b 1
)

echo.
echo ================================================
echo ✓ All checks passed!
echo ================================================
echo.
pause
exit /b 0

:install_deps
echo.
echo Installing missing dependencies...
cd montecarlo
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo.
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)
echo.
echo ✓ Dependencies installed
echo Please run this diagnostic again
pause
exit /b 0

