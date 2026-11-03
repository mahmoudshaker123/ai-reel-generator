@echo off
echo ========================================
echo  Reel Studio — Starting Django Backend
echo  URL: http://localhost:8001
echo ========================================
cd /d "%~dp0backend"
call venv\Scripts\activate
python manage.py runserver 8001
