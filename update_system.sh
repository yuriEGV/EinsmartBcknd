#!/bin/bash
# update_system.sh — Script para actualización automática de Einsmart
# Este script revisa si hay cambios en GitHub y los aplica localmente.

set -e

# Configuración: Rutas relativas desde el repo del backend
BACKEND_DIR="."
FRONTEND_DIR="../Einsmartfrntnd"

echo "🔍 Buscando actualizaciones en GitHub..."

# Función para verificar si hay cambios en un repositorio
check_for_updates() {
    local dir=$1
    echo "   📁 Revisando $dir..."
    cd "$dir"
    git fetch origin main --quiet
    
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse @{u})
    
    if [ "$LOCAL" != "$REMOTE" ]; then
        echo "   ✨ ¡Actualización encontrada en $(basename "$dir")!"
        git pull origin main --quiet
        return 0 # Hubo cambios
    else
        echo "   ✅ $dir ya está actualizado."
        return 1 # No hubo cambios
    fi
}

# Variable para rastrear si algo cambió
UPDATED=false

# Cambiar a la carpeta del script (Backend)
cd "$(dirname "$0")"

# Revisar Backend
if check_for_updates "$BACKEND_DIR"; then
    UPDATED=true
fi

# Revisar Frontend
cd "$(dirname "$0")" # Volver al backend
if check_for_updates "$FRONTEND_DIR"; then
    UPDATED=true
fi

# Si hubo cambios, reconstruir y reiniciar
if [ "$UPDATED" = true ]; then
    echo ""
    echo "🚀 Aplicando cambios y reconstruyendo contenedores..."
    cd "$(dirname "$0")"
    mkdir -p uploads && chmod 775 uploads
    docker compose up -d --build
    echo "✅ Sistema actualizado con éxito."
else
    echo ""
    echo "😴 No hay cambios pendientes. El sistema está al día."
fi
