#!/bin/bash
set -e

# 1. Asegurar que los directorios existan
mkdir -p /app/data/pendientes /app/data/correctas /app/data/correcciones /app/data/incompletos

# 2. Crear un nombre de branch único y configurar el repositorio
source ./scripts/create_branch.sh

# 3. Iniciar monitoreo de archivos en el fondo
./scripts/monitor_files.sh &
MONITOR_PID=$!

# 4. Definir función para capturar señales de terminación
cleanup() {
  echo "Stopping file monitor..."
  kill $MONITOR_PID || true
  
  # Realizar un último commit antes de salir
  if [ -d "/app/git_repo" ] && [ -f "/app/data/.branch_name" ]; then
    BRANCH_NAME=$(cat /app/data/.branch_name)
    cd /app/git_repo
    git add -A
    git commit -m "[shutdown]: Instance terminating" || true
    git push origin "$BRANCH_NAME" || true
  fi
  
  echo "Cleanup complete"
  exit 0
}

# Capturar señales para limpieza
trap cleanup SIGTERM SIGINT

# 5. Iniciar la aplicación Node.js
echo "Starting Node.js application..."
npm start &
NODE_PID=$!

# Esperar a que el proceso de Node.js termine
wait $NODE_PID