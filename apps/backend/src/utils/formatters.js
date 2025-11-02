export function toBooleanish(value) {
  if (value === true || value === 1 || value === '1') return true;
  if (value === false || value === 0 || value === '0') return false;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', 'yes', 'on'].includes(normalized)) return true;
    if (['false', 'no', 'off'].includes(normalized)) return false;
  }
  return value;
}

export function boolish(value, defaultValue = false) {
  const normalized = toBooleanish(value);
  if (typeof normalized === 'boolean') return normalized;
  return defaultValue;
}
