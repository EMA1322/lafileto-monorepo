export const COPY_ES_AR = {
  common: {
    logout: 'Cerrar sesión',
    settings: 'Configuración',
    refresh: 'Actualizar',
    retry: 'Reintentá',
    save: 'Guardar',
    cancel: 'Cancelar',
    close: 'Cerrar',
    search: 'Buscar…',
    loading: 'Cargando…',
    errorGeneric: 'Ocurrió un error.',
    tryAgain: 'Reintentá.',
  },
  products: {
    offerLabel: 'Oferta',
    offerAll: 'Todas',
    offerOnSale: 'En oferta',
    offerNoOffer: 'Sin oferta',
    offerDiscountSuffix: 'OFF',
  },
  dashboard: {
    panelLoading: 'Cargando datos del panel…',
    dataUpdated: 'Datos actualizados.',
    updatedToast: 'Datos actualizados',
    refreshError: 'No se pudo actualizar. Reintentá.',
    emptyPanel: 'No hay datos para mostrar en el panel.',
    loadingError: 'Ocurrió un error al cargar el panel.',
  },
  header: {
    panelTitle: 'Panel de administración',
    currentUser: 'Usuario actual',
    userFallback: 'Usuario',
    signOutAria: 'Cerrar sesión de la cuenta de administración',
    noNavItems: 'No hay opciones de navegación disponibles para tu rol.',
    goToDashboard: 'Ir al panel principal',
    confirmLogout: '¿Seguro que querés cerrar sesión?',
    logoutSuccess: 'Sesión cerrada correctamente',
    logoutError: 'No se pudo cerrar sesión',
    brandLogoAlt: 'Logo del panel de administración',
    dashboardNav: 'Panel',
  },
};

export function format(str, vars = {}) {
  return String(str).replace(/\{(\w+)\}/g, (_, key) => (key in vars ? String(vars[key]) : `{${key}}`));
}

export function t(key, vars) {
  const resolved = String(key)
    .split('.')
    .filter(Boolean)
    .reduce((acc, segment) => (acc && typeof acc === 'object' ? acc[segment] : undefined), COPY_ES_AR);

  if (typeof resolved !== 'string') return key;
  return vars ? format(resolved, vars) : resolved;
}

