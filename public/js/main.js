document.addEventListener('DOMContentLoaded', function() {
    let currentFile = null;
    let currentRating = 0;
    const stars = document.querySelectorAll('.rating-star');
    const toastEl = document.getElementById('toast');
    const toast = new bootstrap.Toast(toastEl);
    
    // Cargar lista de archivos
    async function loadFileList() {
      try {
        const response = await fetch('/api/files');
        const files = await response.json();
        
        const fileListEl = document.getElementById('fileList');
        fileListEl.innerHTML = '';
        
        if (files.length === 0) {
          fileListEl.innerHTML = '<div class="alert alert-info">No hay archivos pendientes</div>';
          return;
        }
        
        files.forEach(file => {
          const item = document.createElement('a');
          item.href = '#';
          item.className = 'list-group-item list-group-item-action';
          item.textContent = file;
          item.onclick = () => loadFile(file);
          fileListEl.appendChild(item);
        });
      } catch (error) {
        showToast('Error', 'No se pudo cargar la lista de archivos', 'error');
      }
    }
    
    // Cargar contenido de un archivo
    async function loadFile(filename) {
      try {
        const response = await fetch(`/api/files/${filename}`);
        const data = await response.json();
        
        currentFile = filename;
        
        // Actualizar UI
        document.getElementById('caseContainer').classList.remove('d-none');
        document.getElementById('welcomeMessage').classList.add('d-none');
        
        document.getElementById('caseTitle').textContent = 'Caso Clínico';
        document.getElementById('caseTimestamp').textContent = data.timestamp || '';
        document.getElementById('caseContent').value = data.parsed_response || '';
        document.getElementById('notesContent').value = '';
        
        // Reset stars
        resetStars();
        
        // Marcar archivo activo en la lista
        const items = document.querySelectorAll('#fileList a');
        items.forEach(item => {
          if (item.textContent === filename) {
            item.classList.add('active');
          } else {
            item.classList.remove('active');
          }
        });
      } catch (error) {
        showToast('Error', 'No se pudo cargar el archivo', 'error');
      }
    }
    
    // Sistema de calificación con estrellas
    function setupStarRating() {
      stars.forEach(star => {
        // Eventos para estrellas completas
        star.addEventListener('click', function() {
          const rating = parseInt(this.getAttribute('data-rating'));
          setRating(rating);
        });
        
        // Para media estrella, click al lado izquierdo
        star.addEventListener('mousemove', function(e) {
          const rect = this.getBoundingClientRect();
          const isLeft = e.clientX - rect.left < rect.width / 2;
          
          if (isLeft) {
            this.classList.remove('fa-solid');
            this.classList.add('fa-regular');
          } else {
            this.classList.remove('fa-regular');
            this.classList.add('fa-solid');
          }
        });
        
        star.addEventListener('mouseleave', function() {
          updateStarsDisplay();
        });
      });
    }
    
    function setRating(rating) {
      // Determinar si es media estrella
      const targetStar = document.querySelector(`.rating-star[data-rating="${rating}"]`);
      const rect = targetStar.getBoundingClientRect();
      const isHalfStar = event.clientX - rect.left < rect.width / 2;
      
      if (isHalfStar) {
        currentRating = rating - 0.5;
      } else {
        currentRating = rating;
      }
      
      document.getElementById('ratingValue').textContent = currentRating;
      updateStarsDisplay();
    }
    
    function updateStarsDisplay() {
      stars.forEach(star => {
        const rating = parseInt(star.getAttribute('data-rating'));
        
        star.classList.remove('fa-solid', 'fa-regular');
        
        if (rating <= Math.floor(currentRating)) {
          star.classList.add('fa-solid');
        } else if (rating === Math.ceil(currentRating) && currentRating % 1 !== 0) {
          star.classList.add('fa-regular');
        } else {
          star.classList.add('fa-regular');
        }
      });
    }
    
    function resetStars() {
      currentRating = 0;
      document.getElementById('ratingValue').textContent = currentRating;
      stars.forEach(star => {
        star.classList.remove('fa-solid');
        star.classList.add('fa-regular');
      });
    }
    
    // Acciones de botones
    document.getElementById('correctButton').addEventListener('click', async function() {
      if (!currentFile) {
        showToast('Error', 'No hay archivo seleccionado', 'error');
        return;
      }
      
      if (currentRating === 0) {
        showToast('Advertencia', 'Por favor, asigne una calificación', 'warning');
        return;
      }
      
      try {
        const response = await fetch('/api/correct', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            filename: currentFile,
            rating: currentRating
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          showToast('Éxito', 'Caso marcado como correcto', 'success');
          resetUI();
          loadFileList();
        } else {
          showToast('Error', 'No se pudo procesar la solicitud', 'error');
        }
      } catch (error) {
        showToast('Error', 'Error en la operación', 'error');
      }
    });
    
    document.getElementById('correctionButton').addEventListener('click', async function() {
      if (!currentFile) {
        showToast('Error', 'No hay archivo seleccionado', 'error');
        return;
      }
      
      const notes = document.getElementById('notesContent').value.trim();
      if (!notes) {
        showToast('Advertencia', 'Por favor, ingrese apuntes de corrección', 'warning');
        return;
      }
      
      try {
        const response = await fetch('/api/correction', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            filename: currentFile,
            correctedCase: document.getElementById('caseContent').value,
            notes: notes
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          showToast('Éxito', 'Corrección enviada', 'success');
          resetUI();
          loadFileList();
        } else {
          showToast('Error', 'No se pudo procesar la solicitud', 'error');
        }
      } catch (error) {
        showToast('Error', 'Error en la operación', 'error');
      }
    });
    
    document.getElementById('incompleteButton').addEventListener('click', async function() {
      if (!currentFile) {
        showToast('Error', 'No hay archivo seleccionado', 'error');
        return;
      }
      
      const notes = document.getElementById('notesContent').value.trim();
      if (!notes) {
        showToast('Advertencia', 'Por favor, ingrese apuntes sobre por qué está incompleto', 'warning');
        return;
      }
      
      try {
        const response = await fetch('/api/incomplete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            filename: currentFile,
            notes: notes
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          showToast('Éxito', 'Caso marcado como incompleto', 'success');
          resetUI();
          loadFileList();
        } else {
          showToast('Error', 'No se pudo procesar la solicitud', 'error');
        }
      } catch (error) {
        showToast('Error', 'Error en la operación', 'error');
      }
    });
    
    // Funciones de utilidad
    function resetUI() {
      currentFile = null;
      document.getElementById('caseContainer').classList.add('d-none');
      document.getElementById('welcomeMessage').classList.remove('d-none');
      document.getElementById('caseContent').value = '';
      document.getElementById('notesContent').value = '';
      resetStars();
    }
    
    function showToast(title, message, type) {
      const toastTitle = document.getElementById('toastTitle');
      const toastMessage = document.getElementById('toastMessage');
      const toastElement = document.getElementById('toast');
      
      toastTitle.textContent = title;
      toastMessage.textContent = message;
      
      // Remover clases de color previas
      toastElement.classList.remove('bg-success', 'bg-warning', 'bg-danger');
      
      // Agregar clase según el tipo
      if (type === 'success') {
        toastElement.classList.add('bg-success', 'text-white');
      } else if (type === 'warning') {
        toastElement.classList.add('bg-warning', 'text-dark');
      } else if (type === 'error') {
        toastElement.classList.add('bg-danger', 'text-white');
      }
      
      toast.show();
    }
    
    // Inicialización
    loadFileList();
    setupStarRating();
  });