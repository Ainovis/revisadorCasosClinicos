document.addEventListener('DOMContentLoaded', function () {
  let currentFile = null;
  let currentRating = 0;
  const stars = document.querySelectorAll('.rating-star');
  const toastEl = document.getElementById('toast');
  const toast = new bootstrap.Toast(toastEl);

  // Setup UI extras (sidebar toggle and theme switch)
  setupUIExtras();

  // Cargar lista de archivos
  async function loadFileList() {
    try {
      const response = await fetch('/api/files');
      const files = await response.json();

      const fileListEl = document.getElementById('fileList');
      fileListEl.innerHTML = '';

      // Actualizar contador de casos
      updateCaseCount(files.length);

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

      // Cargar automáticamente el primer archivo de la lista
      return files[0];
    } catch (error) {
      showToast('Error', 'No se pudo cargar la lista de archivos', 'error');
      return null;
    }
  }

  // Actualizar contador de casos
  function updateCaseCount(count) {
    const caseCountEl = document.getElementById('caseCount');
    if (caseCountEl) {
      caseCountEl.textContent = count;
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
    // Preparamos las estrellas para el efecto reverse
    const starsArray = Array.from(stars);
    starsArray.forEach((star, index) => {
      star.classList.add('hover-reverse');
    });

    stars.forEach((star, index) => {
      // Eventos para estrellas completas y medias
      star.addEventListener('click', function (event) {
        const rating = parseInt(this.getAttribute('data-rating'));
        setRating(rating, event);
      });

      // Hover para todas las estrellas
      star.addEventListener('mousemove', function (event) {
        const rating = parseInt(this.getAttribute('data-rating'));
        const rect = this.getBoundingClientRect();
        const isHalfStar = event.clientX - rect.left < rect.width / 2;

        // Limpiar todas las estrellas primero
        stars.forEach(s => {
          s.classList.remove('active', 'active-half');
        });

        // Aplicar estilos basados en la posición
        stars.forEach(s => {
          const starRating = parseInt(s.getAttribute('data-rating'));

          if (starRating < rating) {
            // Estrellas a la izquierda: siempre activas
            s.classList.add('active');
          } else if (starRating === rating) {
            // Estrella actual: dependiendo de si el cursor está en la mitad izquierda
            if (isHalfStar) {
              s.classList.add('active-half');
            } else {
              s.classList.add('active');
            }
          }
          // Estrellas a la derecha: siempre inactivas
        });
      });

      // Volver al estado actual al salir del hover
      star.addEventListener('mouseleave', function () {
        stars.forEach(s => {
          s.classList.remove('active-half', 'active');
        });
        updateStarsDisplay();
      });
    });

    // Contenedor de estrellas - para manejar el hover en todo el contenedor
    const ratingContainer = document.querySelector('.rating-stars');
    ratingContainer.addEventListener('mouseleave', function () {
      stars.forEach(s => {
        s.classList.remove('active-half', 'active');
      });
      updateStarsDisplay();
    });
  }

  function setRating(rating, event) {
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

      star.classList.remove('fa-solid', 'fa-regular', 'active', 'active-half');

      if (rating <= Math.floor(currentRating)) {
        star.classList.add('fa-solid', 'active');
      } else if (rating === Math.ceil(currentRating) && currentRating % 1 !== 0) {
        star.classList.add('fa-solid', 'active-half');
      } else {
        star.classList.add('fa-regular');
      }
    });
  }

  function resetStars() {
    currentRating = 0;
    document.getElementById('ratingValue').textContent = currentRating;
    stars.forEach(star => {
      star.classList.remove('fa-solid', 'active', 'active-half');
      star.classList.add('fa-regular');
    });
  }

  // Acciones de botones
  document.getElementById('correctButton').addEventListener('click', async function () {
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
          rating: currentRating,
          notes: document.getElementById('notesContent').value
        })
      });

      const result = await response.json();

      if (result.success) {
        showToast('Éxito', 'Caso marcado como correcto', 'success');
        await resetUI();
      } else {
        showToast('Error', 'No se pudo procesar la solicitud', 'error');
      }
    } catch (error) {
      showToast('Error', 'Error en la operación', 'error');
    }
  });

  document.getElementById('correctionButton').addEventListener('click', async function () {
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
          notes: notes,
          rating: currentRating
        })
      });

      const result = await response.json();

      if (result.success) {
        showToast('Éxito', 'Corrección enviada', 'success');
        await resetUI();
      } else {
        showToast('Error', 'No se pudo procesar la solicitud', 'error');
      }
    } catch (error) {
      showToast('Error', 'Error en la operación', 'error');
    }
  });

  document.getElementById('incompleteButton').addEventListener('click', async function () {
    if (!currentFile) {
      showToast('Error', 'No hay archivo seleccionado', 'error');
      return;
    }

    // Quitamos la validación que requiere notas para el botón Incompleto

    try {
      const response = await fetch('/api/incomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filename: currentFile,
          notes: document.getElementById('notesContent').value.trim(),
          rating: currentRating
        })
      });

      const result = await response.json();

      if (result.success) {
        showToast('Éxito', 'Caso marcado como incompleto', 'success');
        await resetUI();
      } else {
        showToast('Error', 'No se pudo procesar la solicitud', 'error');
      }
    } catch (error) {
      showToast('Error', 'Error en la operación', 'error');
    }
  });

  // Funciones de utilidad
  async function resetUI() {
    currentFile = null;
    document.getElementById('caseContent').value = '';
    document.getElementById('notesContent').value = '';
    resetStars();

    // Cargar nueva lista y abrir automáticamente el primer archivo
    const firstFile = await loadFileList();
    if (firstFile) {
      loadFile(firstFile);
    } else {
      // Si no hay archivos, mostrar el mensaje de bienvenida
      document.getElementById('caseContainer').classList.add('d-none');
      document.getElementById('welcomeMessage').classList.remove('d-none');
    }
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

  // Funcionalidad para sidebar toggle y theme switch
  function setupUIExtras() {
    // 1. Crear y agregar elementos a la sidebar
    const sidebar = document.querySelector('.sidebar');

    // Botón toggle para sidebar (ahora primero)
    const sidebarToggle = document.createElement('div');
    sidebarToggle.className = 'sidebar-toggle';
    // Sacamos el contador de casos fuera del span que se oculta
    sidebarToggle.innerHTML = '<i class="fas fa-bars"></i><span class="theme-switch-text">Casos Pendientes</span> <span class="case-count" id="caseCount">0</span>';

    // Theme switch
    const themeSwitch = document.createElement('div');
    themeSwitch.className = 'theme-switch theme-switch-top';
    themeSwitch.innerHTML = `
      <span class="theme-switch-text">Tema Oscuro</span>
      <label class="toggle-switch">
        <input type="checkbox" id="theme-toggle">
        <span class="toggle-slider"></span>
      </label>
    `;

    // Insertar en DOM
    sidebar.insertBefore(sidebarToggle, sidebar.firstChild);
    sidebar.insertBefore(themeSwitch, sidebar.querySelector('.sidebar-toggle').nextSibling);

    // 2. Configurar lógica para sidebar toggle
    sidebarToggle.addEventListener('click', function () {
      sidebar.classList.toggle('collapsed');

      // Guardar el estado
      if (sidebar.classList.contains('collapsed')) {
        localStorage.setItem('sidebarCollapsed', 'true');
      } else {
        localStorage.setItem('sidebarCollapsed', 'false');
      }

      // El CSS se encarga ahora del centrado automáticamente
    });

    // 3. Configurar theme toggle
    const themeToggle = document.getElementById('theme-toggle');

    // Detectar preferencia del sistema
    const prefersDarkMode = window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Verificar si hay tema guardado, si no usar preferencia del sistema o default (oscuro)
    if (localStorage.getItem('theme') === 'light') {
      document.body.classList.remove('dark-theme');
      themeToggle.checked = false;
    } else if (localStorage.getItem('theme') === 'dark') {
      document.body.classList.add('dark-theme');
      themeToggle.checked = true;
    } else if (prefersDarkMode || !localStorage.getItem('theme')) {
      // Por defecto oscuro o según preferencia del sistema
      document.body.classList.add('dark-theme');
      themeToggle.checked = true;
      localStorage.setItem('theme', 'dark');
    }

    // Manejar cambio de tema
    themeToggle.addEventListener('change', function () {
      if (this.checked) {
        document.body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
      } else {
        document.body.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light');
      }
    });

    // 4. Restaurar estado guardado de la sidebar
    if (localStorage.getItem('sidebarCollapsed') === 'true') {
      sidebar.classList.add('collapsed');
      // El CSS se encarga del centrado automáticamente
    }
  }

  // Inicialización
  loadFileList().then(firstFile => {
    if (firstFile) {
      loadFile(firstFile);
    }
  });
  setupStarRating();
});