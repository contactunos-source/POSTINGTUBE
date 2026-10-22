@echo off
title PostBridge SaaS Server
echo Starting PostBridge SaaS on http://localhost:3000 ...
cd /d "%~dp0"
node node_modules\next\dist\bin\next start -p 3000
pause
