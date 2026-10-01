@echo off
chcp 65001 >nul
cd /d "%~dp0"
set STAMP=2026-10-01
set COPYDIR=%~dp0..\test-test_copy_%STAMP%

echo ============================================
echo  Step 1/2: copy platform files (no backups)
echo ============================================
robocopy "%~dp0." "%COPYDIR%" /E /XD _backup_* _backups /XF organize_files.bat /NFL /NDL /NJH /NP
if errorlevel 8 (
  echo.
  echo [ERROR] Copy failed. Nothing was moved.
  pause
  exit /b 1
)

echo.
echo ============================================
echo  Step 2/2: move _backup_* folders into _backups
echo ============================================
if not exist "_backups" mkdir "_backups"
for /d %%D in (_backup_*) do (
  echo moving %%D
  move "%%D" "_backups\%%D" >nul
)

echo.
echo Done.
echo Copy saved at: %COPYDIR%
pause
