export function normalizeModule(raw = {}) {
  const moduleKey = raw.moduleKey || raw.key || '';
  return {
    moduleKey,
    name: raw.name || moduleKey,
  };
}

export function normalizeModulesResponse(response = {}) {
  const items = Array.isArray(response?.data?.items) ? response.data.items : [];
  return items.map(normalizeModule).filter((entry) => entry.moduleKey);
}

export function normalizePermission(raw = {}) {
  return {
    moduleKey: raw.moduleKey || raw.key || '',
    r: Boolean(raw.r),
    w: Boolean(raw.w),
    u: Boolean(raw.u),
    d: Boolean(raw.d),
    changeStatus: Boolean(raw.changeStatus ?? raw.change_status ?? raw['change-status']),
  };
}

export function normalizePermissionsResponse(response = {}) {
  const permissions = Array.isArray(response?.data?.permissions) ? response.data.permissions : [];
  return permissions.map(normalizePermission).filter((entry) => entry.moduleKey);
}

export function buildPermissionsMatrix({ modules = [], permissions = [] } = {}) {
  const byModule = new Map(permissions.map((entry) => [entry.moduleKey, entry]));
  return modules.map((mod) => {
    const existing = byModule.get(mod.moduleKey) || {};
    return {
      moduleKey: mod.moduleKey,
      name: mod.name || mod.moduleKey,
      r: Boolean(existing.r),
      w: Boolean(existing.w),
      u: Boolean(existing.u),
      d: Boolean(existing.d),
      changeStatus: Boolean(existing.changeStatus),
    };
  });
}

export function buildPermissionsPayload(rows = []) {
  return {
    permissions: rows.map((row) => ({
      moduleKey: row.moduleKey,
      r: Boolean(row.r),
      w: Boolean(row.w),
      u: Boolean(row.u),
      d: Boolean(row.d),
      changeStatus: Boolean(row.changeStatus),
    })),
  };
}
