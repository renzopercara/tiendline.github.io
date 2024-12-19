// Esperar a que el DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {

  document.getElementById('current-year').textContent = new Date().getFullYear();

  // Iniciar Locomotive Scroll
  const scroll = new LocomotiveScroll({
    el: document.querySelector('[data-scroll-container]'),
    smooth: true,
    inertia: 0.8, // Ajusta la velocidad del scroll
  });

  // Agregar animaciones de visibilidad
  scroll.on('call', (func, state, event) => {
    if (func === 'show') {
      event.classList.add('visible');
    }
  });

  // Detectar cuando los elementos son visibles
  document.querySelectorAll('h2').forEach((element) => {
    element.setAttribute('data-scroll', 'call:show');
  });
});

