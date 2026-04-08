#!/bin/bash
# backup.sh — Script para respaldo diario de la base de datos Einsmart
# Se recomienda programar con crontab

# Configuración
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="einsmart_db_$TIMESTAMP"
CONTAINER_NAME="einsmart_mongodb"

# Crear directorio de backups si no existe
mkdir -p "$BACKUP_DIR"

echo " iniciando respaldo de la base de datos... ($TIMESTAMP)"

# 1. Ejecutar mongodump dentro del contenedor
docker exec $CONTAINER_NAME mongodump --db Einsmart --out /tmp/dump --quiet

# 2. Copiar el dump desde el contenedor al host
docker cp $CONTAINER_NAME:/tmp/dump/Einsmart "$BACKUP_DIR/$BACKUP_NAME"

# 3. Limpiar dump temporal en el contenedor
docker exec $CONTAINER_NAME rm -rf /tmp/dump

# 4. Comprimir el respaldo
tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" -C "$BACKUP_DIR" "$BACKUP_NAME"
rm -rf "$BACKUP_DIR/$BACKUP_NAME"

# 5. Borrar respaldos de más de 30 días
find "$BACKUP_DIR" -name "einsmart_db_*.tar.gz" -mtime +30 -delete

echo "✅ Respaldo completado: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
echo "♻️ Se eliminaron respaldos antiguos de más de 30 días."
