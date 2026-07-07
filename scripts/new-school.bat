@echo off
:: ============================================================
:: EinSmart - Script para crear rama de nuevo colegio
:: Uso: new-school.bat <nombre-del-colegio>
:: Ejemplo: new-school.bat colegio-san-pedro
:: ============================================================

setlocal enabledelayedexpansion

if "%~1"=="" (
    echo [ERROR] Debes indicar el nombre del colegio.
    echo Uso: new-school.bat ^<nombre-del-colegio^>
    echo Ejemplo: new-school.bat colegio-san-pedro
    exit /b 1
)

set "SCHOOL=%~1"
set "BRANCH=school/%SCHOOL%"

:: Raiz del proyecto (un nivel arriba de /scripts)
set "ROOT_DIR=%~dp0.."
set "BACKEND_DIR=%ROOT_DIR%\einsmartbcknd"
set "FRONTEND_DIR=%ROOT_DIR%\einsmartfrntnd"

echo.
echo ============================================================
echo  EinSmart - Creando rama para: %SCHOOL%
echo  Rama: %BRANCH%
echo ============================================================
echo.

:: ─── 1. BACKEND ─────────────────────────────────────────────
echo [1/3] Procesando BACKEND...
cd /d "%BACKEND_DIR%"
git checkout main
if errorlevel 1 goto :error
git pull origin main
if errorlevel 1 goto :error
git checkout -b "%BRANCH%"
if errorlevel 1 (
    echo [WARN] La rama ya existe, cambiando a ella...
    git checkout "%BRANCH%"
)
git push origin "%BRANCH%"
if errorlevel 1 goto :error
echo [OK] Backend listo en rama %BRANCH%

:: ─── 2. FRONTEND ────────────────────────────────────────────
echo.
echo [2/3] Procesando FRONTEND...
cd /d "%FRONTEND_DIR%"
git checkout main
if errorlevel 1 goto :error
git pull origin main
if errorlevel 1 goto :error
git checkout -b "%BRANCH%"
if errorlevel 1 (
    echo [WARN] La rama ya existe, cambiando a ella...
    git checkout "%BRANCH%"
)
git push origin "%BRANCH%"
if errorlevel 1 goto :error
echo [OK] Frontend listo en rama %BRANCH%

:: ─── 3. MONOREPO RAIZ ───────────────────────────────────────
echo.
echo [3/3] Procesando MONOREPO RAIZ...
cd /d "%ROOT_DIR%"
git checkout main
if errorlevel 1 goto :error
git pull origin main
if errorlevel 1 goto :error
git checkout -b "%BRANCH%"
if errorlevel 1 (
    echo [WARN] La rama ya existe, cambiando a ella...
    git checkout "%BRANCH%"
)
git add einsmartbcknd einsmartfrntnd
git commit -m "chore(%SCHOOL%): inicializar rama y punteros de submodulos para %SCHOOL%" 2>nul
git push origin "%BRANCH%"
if errorlevel 1 goto :error
echo [OK] Monorepo raiz listo en rama %BRANCH%

:: ─── RESUMEN ────────────────────────────────────────────────
echo.
echo ============================================================
echo  COMPLETADO - Ramas creadas para: %SCHOOL%
echo ============================================================
echo  Backend  : https://github.com/yuriEGV/EinsmartBcknd/tree/%BRANCH%
echo  Frontend : https://github.com/yuriEGV/Einsmartfrntnd/tree/%BRANCH%
echo  Monorepo : https://github.com/yuriEGV/EinsmartBcknd/tree/%BRANCH%
echo.
echo  RECUERDA - Para actualizar este colegio con mejoras del core:
echo    git checkout %BRANCH%
echo    git merge main --no-ff -m "merge: integrar mejoras del core en %SCHOOL%"
echo    git push origin %BRANCH%
echo ============================================================
exit /b 0

:error
echo.
echo [ERROR] Algo salio mal. Verifica tu token de GitHub y vuelve a intentar.
exit /b 1
