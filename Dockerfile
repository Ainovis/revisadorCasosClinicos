FROM node:18-alpine

WORKDIR /app

# Copiar los archivos package*.json primero para aprovechar la caché de Docker
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto de la aplicación
COPY . .

# Crear directorios para los datos
RUN mkdir -p data/pendientes data/correctas data/correcciones data/incompletos

# Exponer el puerto
EXPOSE 3000

# Comando para ejecutar la aplicación
CMD ["npm", "start"]