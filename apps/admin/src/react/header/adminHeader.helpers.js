export function getHeaderUserName(user) {
  const value = user?.name || user?.fullName || user?.username || user?.email || '';
  return String(value || '').trim() || 'Usuario';
}

export function getHeaderUserRole(user) {
  const value = user?.roleName || user?.role?.name || user?.role || user?.roleId || '';
  return String(value || '').trim() || '-';
}

export function isHeaderRouteActive(item, activeRoute) {
  if (!item?.key) return false;
  return item.key === activeRoute;
}
