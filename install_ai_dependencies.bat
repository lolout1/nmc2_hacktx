@echo off
echo Installing AI Assistant Dependencies...
echo.

cd /d "%~dp0montecarlo"

echo Installing Python packages...
pip install pandas>=1.3.0
pip install openai>=1.0.0

echo.
echo Installation complete!
echo.
echo To test the AI assistant:
echo 1. Start the development server: npm run dev
echo 2. Load a session (Singapore GP 9161)
echo 3. Select a driver
echo 4. Click "Ask AI" button in the top banner
echo.
pause
