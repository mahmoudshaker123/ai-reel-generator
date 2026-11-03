@echo off
echo ========================================
echo  Reel Studio — Starting Django Backend
echo  URL: http://127.0.0.1:8002
echo ========================================
cd /d "%~dp0backend"
call venv\Scripts\activate
python manage.py runserver 127.0.0.1:8002
