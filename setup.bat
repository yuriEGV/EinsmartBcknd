@echo off
REM setup.bat — Instalador Einsmart para Windows
REM Ejecutar como Administrador la primera vez

echo.
echo =========================================
echo     Einsmart -- Instalacion Local
echo =========================================
echo.

REM Verificar Docker
docker --version > nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker no esta instalado.
    echo Descarga Docker Desktop: https://www.docker.com/products/docker-desktop/
    pause & exit /b 1
)
echo OK: Docker encontrado.

REM Actualizar Repositorios
echo Actualizando Backend (EinsmartBcknd)...
git stash push -m "Auto-stash before setup" > nul 2>&1
git pull || echo AVISO: No se pudo actualizar el backend automaticamente.

REM Clonar frontend si no existe
if not exist "..\Einsmartfrntnd" (
    echo Clonando frontend...
    git clone https://github.com/yuriEGV/Einsmartfrntnd.git ..\Einsmartfrntnd
    echo OK: Frontend clonado.
) else (
    echo OK: Frontend ya existe. Actualizando...
    git -C ..\Einsmartfrntnd stash push -m "Auto-stash before setup" > nul 2>&1
    git -C ..\Einsmartfrntnd pull || echo AVISO: No se pudo actualizar el frontend automaticamente.
)

REM Crear .env.local si no existe
if not exist .env.local (
    copy .env.local.example .env.local
    echo.
    echo Edita el archivo .env.local con los datos del colegio y vuelve a ejecutar.
    notepad .env.local
    pause & exit /b 0
)
echo OK: .env.local encontrado.

REM Levantar contenedores
echo.
if not exist uploads mkdir uploads
echo Levantando Einsmart (con reconstruccion forzada)...
docker compose down
docker compose up -d --build --force-recreate

echo.
echo Esperando que el sistema arranque (30 seg)...
timeout /t 30 /nobreak > nul

docker compose ps

echo.
echo =========================================
echo  EINSMART LISTO - Accede desde la LAN:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do echo   http://%%a
echo =========================================
echo.
pause
