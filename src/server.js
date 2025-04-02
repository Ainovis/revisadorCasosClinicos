const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs-extra');
const fileHandler = require('./fileHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Asegurarse de que existan los directorios necesarios
const setupDirectories = async () => {
  const dirs = [
    '../data/pendientes',
    '../data/correctas',
    '../data/correcciones',
    '../data/incompletos'
  ];
  
  for (const dir of dirs) {
    await fs.ensureDir(path.join(__dirname, dir));
  }
};

// Rutas API
// Obtener lista de archivos pendientes
app.get('/api/files', async (req, res) => {
  try {
    const files = await fileHandler.getPendingFiles();
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener contenido de un archivo específico
app.get('/api/files/:filename', async (req, res) => {
  try {
    const fileData = await fileHandler.getFileContent(req.params.filename);
    res.json(fileData);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Marcar como correcto
app.post('/api/correct', async (req, res) => {
  try {
    const { filename, rating } = req.body;
    await fileHandler.markAsCorrect(filename, rating);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Enviar corrección
app.post('/api/correction', async (req, res) => {
  try {
    const { filename, correctedCase, notes } = req.body;
    await fileHandler.sendCorrection(filename, correctedCase, notes);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Marcar como incompleto
app.post('/api/incomplete', async (req, res) => {
  try {
    const { filename, notes } = req.body;
    await fileHandler.markAsIncomplete(filename, notes);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Iniciar servidor
(async () => {
  try {
    await setupDirectories();
    app.listen(PORT, () => {
      console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
  }
})();