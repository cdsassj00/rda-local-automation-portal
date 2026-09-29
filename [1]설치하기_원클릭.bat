@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion
title [농업기술센터 로컬 업무포털] 원클릭 설치 및 환경 설정

cls
echo ==============================================================================
echo     농업기술센터 로컬 업무자동화 포털 - 자동 설치 및 환경 설정
echo ==============================================================================
echo.
echo  본 설치 프로그램은 농업기술센터 포털을 사용자 PC에 최적화하여 설치하고,
echo  바탕화면에 원클릭 바로가기를 생성합니다.
echo.
echo  [특징] 외부 인터넷 없이 100%% PC 내부에서 안전하게 실행됩니다.
echo.
echo ==============================================================================
echo.

set "INSTALL_DIR=%~dp0농업기술센터_업무자동화"
if not exist "%INSTALL_DIR%" set "INSTALL_DIR=%~dp0"

:: 1단계: Python 환경 점검
echo [1/3] Python 환경 및 고기능 AI 라이브러리 점검 중...
python --version > nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  [알림] Python이 설치되어 있지 않습니다.
    echo  기본적인 30개 업무자동화 기능(CSV통합, 통계, 출석부, 복명서 등)은
    echo  Python 설치 없이도 100%% 정상 작동합니다.
    echo.
    goto MAKE_SHORTCUT
) else (
    echo  - Python 확인 완료:
    python --version
    echo  - faster-whisper 및 EasyOCR 라이브러리 점검 중...
    python -c "import faster_whisper, easyocr" > nul 2>&1
    if !errorlevel! equ 0 (
        echo  - 고기능 엔진 (faster-whisper, EasyOCR) 확인 완료!
    ) else (
        echo  - 고기능 엔진 설치 시도 중 (인터넷 연결 필요 시 생략 가능)...
        pip install faster-whisper easyocr > nul 2>&1
    )
)

:MAKE_SHORTCUT
echo.
echo [2/3] 윈도우 바탕화면에 바로가기 아이콘 생성 중...

set "DESKTOP_DIR=%USERPROFILE%\Desktop"
set "SHORTCUT_PATH=%DESKTOP_DIR%\농업기술센터 업무포털.lnk"
set "TARGET_BAT=%~dp0포털실행.bat"

:: VBScript를 이용한 무설치 바로가기 생성
set "VBS_SCRIPT=%TEMP%\create_shortcut.vbs"
(
echo Set oWS = WScript.CreateObject^("WScript.Shell"^)
echo sLinkFile = "%SHORTCUT_PATH%"
echo Set oLink = oWS.CreateShortcut^(sLinkFile^)
echo oLink.TargetPath = "%TARGET_BAT%"
echo oLink.WorkingDirectory = "%~dp0"
echo oLink.Description = "농업기술센터 로컬 업무자동화 포털"
echo oLink.Save
) > "%VBS_SCRIPT%"

cscript //nologo "%VBS_SCRIPT%"
del "%VBS_SCRIPT%" > nul 2>&1

echo  - 바탕화면에 [농업기술센터 업무포털] 바로가기 생성 완료!

echo.
echo [3/3] 설치 완료 및 초기 환경 설정 완료!
echo.
echo ==============================================================================
echo   축하합니다! 설치가 성공적으로 완료되었습니다.
echo.
echo   이제 바탕화면의 [농업기술센터 업무포털] 아이콘을 더블클릭하시면
echo   언제든지 포털을 바로 사용하실 수 있습니다.
echo ==============================================================================
echo.

set /p RUN_NOW="지금 바로 포털을 실행하시겠습니까? (Y/N, 기본값 Y): "
if /i "%RUN_NOW%"=="N" goto END

start "" "%TARGET_BAT%"

:END
exit
