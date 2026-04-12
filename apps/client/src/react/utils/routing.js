const REACT_ROUTE_PATTERNS = ['#/r', '#r', '#/home', '#home'];

export function isReactHashRoute(hash = '') {
  const normalized = String(hash || '').toLowerCase();
  if (!normalized) return true;

  return REACT_ROUTE_PATTERNS.some((pattern) => normalized === pattern || normalized.startsWith(`${pattern}/`));
}

export function isReactRouteKey(routeKey = '') {
  const normalized = String(routeKey || '').toLowerCase();
  return normalized === '' || normalized === 'home' || normalized === 'r' || normalized.startsWith('r/') || normalized.startsWith('/r');
}
