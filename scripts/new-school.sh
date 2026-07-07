#!/bin/bash
# ============================================================
# EinSmart - Script para crear rama de nuevo colegio
# Uso: ./new-school.sh <nombre-del-colegio>
# Ejemplo: ./new-school.sh colegio-san-pedro
# ============================================================

set -e

if [ -z "$1" ]; then
  echo "[ERROR] Debes indicar el nombre del colegio."
  echo "Uso: ./new-school.sh <nombre-del-colegio>"
  echo "Ejemplo: ./new-school.sh colegio-san-pedro"
  exit 1
fi

SCHOOL="$1"
BRANCH="school/$SCHOOL"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/einsmartbcknd"
FRONTEND_DIR="$ROOT_DIR/einsmartfrntnd"

echo ""
echo "============================================================"
echo " EinSmart - Creando rama para: $SCHOOL"
echo " Rama: $BRANCH"
echo "============================================================"
echo ""

create_branch() {
  local dir="$1"
  local label="$2"
  echo "[$label] Procesando..."
  cd "$dir"
  git checkout main
  git pull origin main
  git checkout -b "$BRANCH" 2>/dev/null || (echo "[WARN] Rama ya existe, cambiando..." && git checkout "$BRANCH")
  git push origin "$BRANCH"
  echo "[OK] $label listo en rama $BRANCH"
}

# 1. Backend
create_branch "$BACKEND_DIR" "BACKEND"
echo ""

# 2. Frontend
create_branch "$FRONTEND_DIR" "FRONTEND"
echo ""

# 3. Monorepo raíz
echo "[MONOREPO] Procesando..."
cd "$ROOT_DIR"
git checkout main
git pull origin main
git checkout -b "$BRANCH" 2>/dev/null || (echo "[WARN] Rama ya existe, cambiando..." && git checkout "$BRANCH")
git add einsmartbcknd einsmartfrntnd
git commit -m "chore($SCHOOL): inicializar rama y punteros de submodulos para $SCHOOL" 2>/dev/null || true
git push origin "$BRANCH"
echo "[OK] Monorepo raiz listo en rama $BRANCH"

echo ""
echo "============================================================"
echo " COMPLETADO - Ramas creadas para: $SCHOOL"
echo "============================================================"
echo " Backend  : https://github.com/yuriEGV/EinsmartBcknd/tree/$BRANCH"
echo " Frontend : https://github.com/yuriEGV/Einsmartfrntnd/tree/$BRANCH"
echo " Monorepo : https://github.com/yuriEGV/EinsmartBcknd/tree/$BRANCH"
echo ""
echo " RECUERDA - Para actualizar este colegio con mejoras del core:"
echo "   git checkout $BRANCH"
echo "   git merge main --no-ff -m \"merge: integrar mejoras del core en $SCHOOL\""
echo "   git push origin $BRANCH"
echo "============================================================"
