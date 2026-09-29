@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion
title [농업기술센터 로컬 업무포털]

set "PORTAL_DIR=%~dp0농업기술센터_업무자동화"
if not exist "%PORTAL_DIR%" set "PORTAL_DIR=%~dp0"

echo ==============================================================================
echo     농업기술센터 로컬 업무자동화 포털 실행 중...
echo     (외부 인터넷 통신 없음 / 100%% PC 내부 안전 처리)
echo ==============================================================================

:: Python 환경 확인 후 고기능 로컬 서버 실행
python --version > nul 2>&1
if %errorlevel% equ 0 (
    echo [안내] Python 환경 확인: 고기능 AI 엔진(faster-whisper, EasyOCR)을 백그라운드로 시작합니다...
    start /B python "%PORTAL_DIR%\app_server.py" > nul 2>&1
    timeout /t 1 /nobreak > nul
    start "" "http://127.0.0.1:8765"
) else (
    echo [안내] 표준 브라우저 모드로 포털을 실행합니다...
    start "" "%PORTAL_DIR%\index.html"
)

exit
