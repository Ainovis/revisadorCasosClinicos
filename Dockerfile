FROM node:18-alpine

# Instalar Git y dependencias necesarias
RUN apk add --no-cache git bash inotify-tools

WORKDIR /app

# Copiar archivos de configuración y scripts
COPY package*.json ./
COPY scripts/ ./scripts/
RUN chmod +x ./scripts/*.sh

# Instalar dependencias
RUN npm install

# Copiar el resto de la aplicación
COPY . .

# Crear directorios necesarios
RUN mkdir -p data/pendientes data/correctas data/correcciones data/incompletos

# Variable para almacenar el nombre del branch
ENV BRANCH_NAME=""

EXPOSE 3000

# Nuevo comando de inicio
CMD ["./scripts/entrypoint.sh"]