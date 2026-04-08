@echo off
REM update_system.bat — Script para actualización automática de Einsmart (Windows)

set BACKEND_DIR=.
set FRONTEND_DIR=..\Einsmartfrntnd

echo Buscando actualizaciones en GitHub...

REM 1. Revisar Backend
echo    Revisando Backend...
git fetch origin main --quiet
git diff --quiet HEAD origin/main
if %errorlevel% neq 0 (
    echo    Actualización encontrada en Backend. Descargando...
    git pull origin main --quiet
    set UPDATED=true
) else (
    echo    Backend ya esta actualizado.
)

REM 2. Revisar Frontend
echo    Revisando Frontend...
if exist %FRONTEND_DIR% (
    cd %FRONTEND_DIR%
    git fetch origin main --quiet
    git diff --quiet HEAD origin/main
    if %errorlevel% neq 0 (
        echo    Actualización encontrada en Frontend. Descargando...
        git pull origin main --quiet
        set UPDATED=true
    ) else (
        echo    Frontend ya esta actualizado.
    )
    cd ..\EinsmartBcknd
)

REM 3. Si hubo cambios, reiniciar
if "%UPDATED%"=="true" (
    echo.
    echo Aplicando cambios y reconstruyendo contenedores...
    docker compose up -d --build
    echo OK: Sistema actualizado.
) else (
    echo.
    echo No hay cambios pendientes.
)

pause
