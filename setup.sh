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

# 2. Actualizar Repositorios
echo "📥 Actualizando Backend (EinsmartBcknd)..."
if [ -d .git ]; then
    git stash push --message "Auto-stash before setup" || true
    git pull || echo "⚠️  No se pudo actualizar el backend automáticamente."
fi

FRONTEND_DIR="../Einsmartfrntnd"
if [ ! -d "$FRONTEND_DIR" ]; then
    echo "📥 Clonando frontend..."
    git clone https://github.com/yuriEGV/Einsmartfrntnd.git "$FRONTEND_DIR"
    echo "✅ Frontend clonado en $FRONTEND_DIR"
else
    echo "✅ Frontend ya existe — actualizando..."
    git -C "$FRONTEND_DIR" stash push --message "Auto-stash before setup" || true
    git -C "$FRONTEND_DIR" pull || echo "⚠️  No se pudo actualizar el frontend automáticamente."
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

echo "🚀 Levantando Einsmart (con reconstrucción forzada)..."
docker compose down
docker compose up -d --build --force-recreate

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
