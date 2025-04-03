#!/bin/bash
set -e

# Generar un identificador único para esta instancia
INSTANCE_ID=$(cat /proc/sys/kernel/random/uuid | cut -d'-' -f1)

# Verificar si existe .env y extraer NAME y GIT_TOKEN si están presentes
ENV_NAME=""
GIT_TOKEN=""
if [ -f ".env" ]; then
  # Extraer valor de NAME de .env si existe
  ENV_NAME=$(grep -E "^NAME=" .env | cut -d'=' -f2 | tr -d '"' | tr -d "'" || echo "")
  # Extraer valor de GIT_TOKEN de .env si existe
  GIT_TOKEN=$(grep -E "^GIT_TOKEN=" .env | cut -d'=' -f2 | tr -d '"' | tr -d "'" || echo "")
fi

# Crear el nombre del branch
if [ -n "$ENV_NAME" ]; then
  BRANCH_NAME="instance-${ENV_NAME}-${INSTANCE_ID}"
else
  BRANCH_NAME="instance-${INSTANCE_ID}"
fi

# Guardar el nombre del branch en una variable de entorno
export BRANCH_NAME

# Guardar el nombre del branch en un archivo para futuras referencias
echo "$BRANCH_NAME" > /app/data/.branch_name

echo "Created branch name: $BRANCH_NAME"

# Configurar Git
git config --global user.email "docker@instance.local"
git config --global user.name "Docker Instance"

# Determinar la URL del repositorio
REPO_URL="https://github.com/$GIT_REPO.git"
if [ -n "$GIT_TOKEN" ]; then
  REPO_URL="https://${GIT_TOKEN}@github.com/$GIT_REPO.git"
  echo "Using authenticated GitHub URL with token"
else
  echo "WARNING: No GIT_TOKEN found in .env. Using public URL, push operations may fail."
fi

# Crear un directorio temporal para el repositorio
REPO_DIR="/app/git_repo"
mkdir -p "$REPO_DIR"

# Clonar el repositorio
echo "Cloning repository: $GIT_REPO"
git clone "$REPO_URL" "$REPO_DIR"
cd "$REPO_DIR"

# Crear y cambiar al nuevo branch
git checkout -b "$BRANCH_NAME"

# Hacer commit inicial para establecer el branch
touch .branch-info
echo "$BRANCH_NAME" > .branch-info
git add .branch-info
git commit -m "Initial commit for instance $BRANCH_NAME"

# Intentar hacer push del nuevo branch
echo "Pushing new branch to remote repository"
if git push -u origin "$BRANCH_NAME"; then
  echo "Successfully pushed new branch $BRANCH_NAME to remote"
else
  echo "Failed to push to remote repository. Check your GIT_TOKEN and permissions."
fi

# Crear un enlace simbólico para que los scripts posteriores sepan dónde está el repo
ln -sf "$REPO_DIR" /app/git_repo_link

# Enlazar directorios de datos al repositorio git
mkdir -p "$REPO_DIR/data"
for dir in pendientes correctas correcciones incompletos; do
  mkdir -p "$REPO_DIR/data/$dir"
done

# Usamos rsync para vincular los datos iniciales si existen
if [ -d "/app/data" ]; then
  for dir in pendientes correctas correcciones incompletos; do
    if [ -d "/app/data/$dir" ] && [ "$(ls -A /app/data/$dir 2>/dev/null)" ]; then
      echo "Copying existing files from /app/data/$dir to repository"
      cp -r /app/data/$dir/* "$REPO_DIR/data/$dir/" 2>/dev/null || true
    fi
  done
  
  # Commit de archivos iniciales si existen
  cd "$REPO_DIR"
  git add -A
  git commit -m "Add initial data files" || echo "No initial data files to commit"
  git push origin "$BRANCH_NAME" || echo "Could not push initial data files"
fi

echo "Branch setup complete: $BRANCH_NAME"