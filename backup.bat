@echo off
REM backup.bat — Script para respaldo diario de la base de datos Einsmart (Windows)
REM Se recomienda programar con el Programador de Tareas

set BACKUP_DIR=.\backups
set TIMESTAMP=%date:~10,4%%date:~7,2%%date:~4,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_NAME=einsmart_db_%TIMESTAMP%
set CONTAINER_NAME=einsmart_mongodb

if not exist %BACKUP_DIR% mkdir %BACKUP_DIR%

echo Iniciando respaldo de la base de datos... (%TIMESTAMP%)

REM 1. Ejecutar mongodump dentro del contenedor
docker exec %CONTAINER_NAME% mongodump --db Einsmart --out /tmp/dump --quiet

REM 2. Copiar el dump desde el contenedor al host
docker cp %CONTAINER_NAME%:/tmp/dump/Einsmart %BACKUP_DIR%\%BACKUP_NAME%

REM 3. Limpiar dump temporal en el contenedor
docker exec %CONTAINER_NAME% rm -rf /tmp/dump

echo OK: Respaldo guardado en %BACKUP_DIR%\%BACKUP_NAME%

REM Nota: Para comprimir en Windows recomendamos tener 7-zip o usar PowerShell
powershell -Command "Compress-Archive -Path '%BACKUP_DIR%\%BACKUP_NAME%' -DestinationPath '%BACKUP_DIR%\%BACKUP_NAME%.zip'"
rmdir /s /q %BACKUP_DIR%\%BACKUP_NAME%

echo OK: Comprimido en %BACKUP_DIR%\%BACKUP_NAME%.zip
pause
