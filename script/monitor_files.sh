#!/bin/bash

# Directorios a monitorear
DIRS="/app/data/pendientes /app/data/correctas /app/data/correcciones /app/data/incompletos"

# Ruta al repositorio git
REPO_DIR="/app/git_repo"

echo "Starting file monitoring for directories: $DIRS"
echo "Using git repository at: $REPO_DIR"

# Cargar el nombre de la rama desde el archivo guardado
BRANCH_NAME=$(cat /app/data/.branch_name)
echo "Using branch: $BRANCH_NAME"

# Función para sincronizar cambios con el repositorio git y hacer commit
commit_change() {
  local file="$1"
  local subdirectory=$(basename $(dirname "$file"))
  local filename=$(basename "$file")
  
  # Crear mensaje de commit
  local commit_message="[$subdirectory]: $filename"
  
  # Copiar el archivo al repositorio git
  local target_dir="$REPO_DIR/data/$subdirectory"
  mkdir -p "$target_dir"
  
  # Si el archivo existe, copiarlo al repositorio
  if [ -f "$file" ]; then
    cp "$file" "$target_dir/"
    echo "Copied file to git repository: $file -> $target_dir/$filename"
  fi
  
  # Añadir cambios y realizar commit
  echo "Detected file change: $file"
  echo "Committing with message: $commit_message"
  
  cd "$REPO_DIR"
  git add -A
  
  if git commit -m "$commit_message"; then
    echo "Successfully committed changes"
    
    # Intentar hacer push de los cambios
    if git push origin "$BRANCH_NAME"; then
      echo "Successfully pushed changes to remote"
    else
      echo "Failed to push changes to remote"
    fi
  else
    echo "No changes to commit or commit failed"
  fi
}

# También monitorear los archivos eliminados
detect_removals() {
  local monitored_dirs=($DIRS)
  
  while true; do
    for dir in "${monitored_dirs[@]}"; do
      # Obtener una lista de archivos actuales
      curr_files=$(find "$dir" -type f -name "*.json" 2>/dev/null | sort)
      
      # Verificar archivos eliminados comparando con el repositorio
      repo_dir="$REPO_DIR/data/$(basename "$dir")"
      if [ -d "$repo_dir" ]; then
        repo_files=$(find "$repo_dir" -type f -name "*.json" 2>/dev/null | sort)
        
        for repo_file in $repo_files; do
          filename=$(basename "$repo_file")
          if [ ! -f "$dir/$filename" ]; then
            # El archivo existe en el repo pero no en el directorio monitoreado
            echo "Detected file removal: $dir/$filename"
            
            # Eliminar el archivo del repositorio
            rm -f "$repo_file"
            
            # Commit el cambio
            cd "$REPO_DIR"
            git add -A
            git commit -m "[removed from $dir]: $filename" && git push origin "$BRANCH_NAME" || true
          fi
        done
      fi
    done
    
    # Verificar cada 10 segundos
    sleep 10
  done
}

# Iniciar el detector de eliminaciones en segundo plano
detect_removals &

# Usar inotifywait para monitorear cambios en los directorios
inotifywait -m -r -e moved_to,create,modify $DIRS | while read dir event file; do
  commit_change "$dir$file"
done