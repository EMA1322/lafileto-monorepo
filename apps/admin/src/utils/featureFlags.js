export function isFeatureEnabled(rawValue) {
  const normalized = String(rawValue ?? '')
    .trim()
    .toLowerCase();

  return normalized === 'true' || normalized === '1';
}
