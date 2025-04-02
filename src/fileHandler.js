const fs = require('fs-extra');
const path = require('path');

const PENDING_DIR = path.join(__dirname, '../data/pendientes');
const CORRECT_DIR = path.join(__dirname, '../data/correctas');
const CORRECTION_DIR = path.join(__dirname, '../data/correcciones');
const INCOMPLETE_DIR = path.join(__dirname, '../data/incompletos');

// Obtener archivos pendientes
const getPendingFiles = async () => {
  const files = await fs.readdir(PENDING_DIR);
  return files.filter(file => file.endsWith('.json'));
};

// Obtener contenido de un archivo
const getFileContent = async (filename) => {
  const filePath = path.join(PENDING_DIR, filename);
  if (!await fs.pathExists(filePath)) {
    throw new Error('Archivo no encontrado');
  }
  const content = await fs.readJson(filePath);
  return content;
};

// Marcar como correcto
const markAsCorrect = async (filename, rating, notes = "") => {
  const sourcePath = path.join(PENDING_DIR, filename);
  const destPath = path.join(CORRECT_DIR, filename);
  
  const content = await fs.readJson(sourcePath);
  content.puntuacion = parseFloat(rating) || 0;
  
  // Añadir notas si existen
  if (notes && notes.trim() !== "") {
    content.apuntes_correccion = notes;
  }
  
  await fs.writeJson(destPath, content, { spaces: 2 });
  await fs.remove(sourcePath);
};

// Enviar corrección
const sendCorrection = async (filename, correctedCase, notes, rating = 0) => {
  const sourcePath = path.join(PENDING_DIR, filename);
  const destPath = path.join(CORRECTION_DIR, filename);
  
  const content = await fs.readJson(sourcePath);
  content.caso_corregido = correctedCase;
  content.apuntes_correccion = notes;
  
  // Añadir puntuación si existe
  if (rating) {
    content.puntuacion = parseFloat(rating);
  }
  
  await fs.writeJson(destPath, content, { spaces: 2 });
  await fs.remove(sourcePath);
};

// Marcar como incompleto
const markAsIncomplete = async (filename, notes, rating = 0) => {
  const sourcePath = path.join(PENDING_DIR, filename);
  const destPath = path.join(INCOMPLETE_DIR, filename);
  
  const content = await fs.readJson(sourcePath);
  content.apuntes_correccion = notes;
  
  // Añadir puntuación si existe
  if (rating) {
    content.puntuacion = parseFloat(rating);
  }
  
  await fs.writeJson(destPath, content, { spaces: 2 });
  await fs.remove(sourcePath);
};

module.exports = {
  getPendingFiles,
  getFileContent,
  markAsCorrect,
  sendCorrection,
  markAsIncomplete
};