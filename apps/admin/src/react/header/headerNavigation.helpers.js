export const HEADER_NAV_ITEMS = [
  { key: 'dashboard', label: 'Panel', hash: '#dashboard', icon: 'dashboard' },
  { key: 'products', label: 'Productos', hash: '#products', icon: 'products' },
  { key: 'categories', label: 'Categorias', hash: '#categories', icon: 'categories' },
  { key: 'users', label: 'Usuarios', hash: '#users', icon: 'users' },
  { key: 'settings', label: 'Configuracion', hash: '#settings', icon: 'settings' },
];

export function normalizeHashRoute(hash = '') {
  const value = String(hash || '').trim() || '#login';
  const normalized = value.startsWith('#') ? value : `#${value}`;
  return normalized.split('?')[0].toLowerCase();
}

export function getActiveHeaderRoute(hash = '') {
  return normalizeHashRoute(hash).replace(/^#/, '') || 'login';
}

export function getVisibleHeaderNavItems({
  canReadModule,
  featureSettings = false,
  items = HEADER_NAV_ITEMS,
  canAccessUserManagement = () => false,
} = {}) {
  const canRead = typeof canReadModule === 'function' ? canReadModule : () => false;
  const canAccessUsers =
    typeof canAccessUserManagement === 'function' ? canAccessUserManagement : () => false;

  return items.filter((item) => {
    if (!item || !item.key || !item.hash) return false;
    if (item.key === 'settings' && !featureSettings) return false;
    if (item.key === 'users' && !canAccessUsers()) return false;
    return canRead(item.key);
  });
}
