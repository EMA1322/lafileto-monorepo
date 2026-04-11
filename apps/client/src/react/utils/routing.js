const REACT_ROUTE_PATTERNS = ['#/r', '#r'];

export function isReactHashRoute(hash = '') {
  const normalized = String(hash || '').toLowerCase();
  return REACT_ROUTE_PATTERNS.some((pattern) => normalized === pattern || normalized.startsWith(`${pattern}/`));
}

export function isReactRouteKey(routeKey = '') {
  const normalized = String(routeKey || '').toLowerCase();
  return normalized === 'r' || normalized.startsWith('r/') || normalized.startsWith('/r');
}
