const REACT_ROUTE_PATTERNS = ['#/r', '#r', '#/home', '#home', '#/products', '#products', '#/cart', '#cart'];

export function isReactHashRoute(hash = '') {
  const normalized = String(hash || '').toLowerCase();
  if (!normalized) return true;

  return REACT_ROUTE_PATTERNS.some((pattern) => normalized === pattern || normalized.startsWith(`${pattern}/`));
}

export function isReactRouteKey(routeKey = '') {
  const normalized = String(routeKey || '').toLowerCase();
  return (
    normalized === '' ||
    normalized === 'home' ||
    normalized === 'products' ||
    normalized === 'cart' ||
    normalized === 'r' ||
    normalized === 'r/products' ||
    normalized === 'r/cart' ||
    normalized.startsWith('r/') ||
    normalized.startsWith('/r')
  );
}
