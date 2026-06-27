// ================================
// main.js - ADMIN PANEL (code-splitting activado)
// ================================

// Estilos globales SIEMPRE presentes
import 'normalize.css';
import './styles/core/tokens.css';
import './styles/core/base.css';
import './styles/core/icons.css';
import './styles/components/components.css';
// import './styles/global.css'; // REMOVIDO: migrado a tokens/base/components

// Las pantallas React cargan sus CSS Modules; los modulos legacy restantes
// mantienen su CSS por fragment cuando corresponda.
// - header: React; no usa fragment/CSS legacy

import { initRouter } from './utils/router.js';
import { initModals } from './utils/modals.js';

function initApp() {
  // 1) Inicializar modales globales (accesibles)
  initModals();

  // 2) Iniciar router con guards (auth + RBAC)
  initRouter();
}

document.addEventListener('DOMContentLoaded', initApp);
