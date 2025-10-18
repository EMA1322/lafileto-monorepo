// ================================
// main.js – ADMIN PANEL (code-splitting activado)
// ================================

// Estilos globales que deben estar SIEMPRE
import 'normalize.css';
import '@/styles/core/tokens.css';
import '@/styles/core/base.css';
import '@/styles/components/components.css';
import '@/styles/global.css';
import '@/styles/modals.css';

// A partir de ahora, cada módulo carga SU CSS:
// - login:     link en /components/login/login.html
// - header:    link en /components/header/header.html
// - dashboard: link en /components/dashboard/dashboard.html
// - otros:     iremos migrando uno a uno
// import '@/styles/dashboard.css'; // ⬅️ REMOVIDO (code-splitting real)
//import '@/styles/products.css';
//import '@/styles/categories.css';

import { initRouter } from '@/utils/router.js';
import { initModals } from '@/utils/modals.js';

function initApp() {
  // 1) Inicializar modales globales (accesibles)
  initModals();

  // 2) Iniciar router con guards (auth + RBAC)
  initRouter();
}

document.addEventListener('DOMContentLoaded', initApp);

