#!/bin/bash
# setup.sh — Instalador Einsmart para Linux/Mac
# Ejecutar una sola vez: ./setup.sh

set -e

echo ""
echo "╔════════════════════════════════════════╗"
echo "║      Einsmart — Instalación Local      ║"
echo "╚════════════════════════════════════════╝"
echo ""

# 1. Verificar Docker
if ! command -v docker &> /dev/null; then
    echo "🔧 Instalando Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    echo "✅ Docker instalado. REINICIA la sesión y vuelve a ejecutar este script."
    exit 0
fi
echo "✅ Docker: $(docker --version)"

# 2. Actualizar Repositorios (Limpieza Profunda)
echo "📥 Actualizando Backend (EinsmartBcknd)..."
if [ -d .git ]; then
    git fetch origin main
    git reset --hard origin/main
    echo "✅ Backend reseteado a la última versión de GitHub."
fi

FRONTEND_DIR="../Einsmartfrntnd"
if [ ! -d "$FRONTEND_DIR" ]; then
    echo "📥 Clonando frontend..."
    git clone https://github.com/yuriEGV/Einsmartfrntnd.git "$FRONTEND_DIR"
    echo "✅ Frontend clonado en $FRONTEND_DIR"
else
    echo "✅ Frontend ya existe — actualizando con limpieza..."
    git -C "$FRONTEND_DIR" fetch origin main
    git -C "$FRONTEND_DIR" reset --hard origin/main
    echo "✅ Frontend reseteado a la última versión de GitHub."
fi

# 3. Crear .env.local si no existe
if [ ! -f .env.local ]; then
    cp .env.local.example .env.local
    echo ""
    echo "📝 Configurando el colegio..."
    read -p "  Nombre del colegio: " school_name
    read -p "  Contraseña base de datos: " db_pass
    jwt_secret=$(openssl rand -base64 48 | tr -d '\n')

    sed -i "s/Nombre del Colegio/$school_name/g" .env.local
    sed -i "s/AppPassword2024!/$db_pass/g" .env.local
    sed -i "s/CambiarEstaContraseña2024!/$db_pass/g" .env.local
    sed -i "s/CambiarPorUnaCadenaAleatoriaMuyLargaDeMinimo32Caracteres/$jwt_secret/g" .env.local
    echo "✅ .env.local configurado."
else
    echo "✅ .env.local ya existe."
fi

# 4. Levantar contenedores
echo ""
echo "📂 Asegurando directorios de persistencia..."
mkdir -p uploads && chmod 775 uploads

echo "🚀 Reconstruyendo Einsmart desde cero (SIN CACHÉ)..."
docker compose down
docker compose build --no-cache
docker compose up -d

echo ""
echo "⏳ Esperando que el sistema arranque..."
sleep 15

docker compose ps

LOCAL_IP=$(hostname -I | awk '{print $1}')
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✅ Einsmart está listo                              ║"
echo "║                                                      ║"
echo "║  Desde este equipo:   http://localhost               ║"
echo "║  Desde la LAN:        http://$LOCAL_IP               ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
