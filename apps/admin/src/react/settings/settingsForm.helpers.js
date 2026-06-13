export function getIn(source, path, fallback = '') {
  return (
    String(path || '')
      .split('.')
      .filter(Boolean)
      .reduce((current, key) => (current == null ? fallback : current[key]), source) ?? fallback
  );
}

export function setIn(source, path, value) {
  const keys = String(path || '')
    .split('.')
    .filter(Boolean);
  if (!keys.length) return source;

  const next = Array.isArray(source) ? [...source] : { ...source };
  let cursor = next;

  keys.forEach((key, index) => {
    const isLast = index === keys.length - 1;
    if (isLast) {
      cursor[key] = value;
      return;
    }

    const current = cursor[key];
    const nextKey = keys[index + 1];
    const shouldBeArray = /^\d+$/.test(nextKey);
    cursor[key] = Array.isArray(current)
      ? [...current]
      : current && typeof current === 'object'
        ? { ...current }
        : shouldBeArray
          ? []
          : {};
    cursor = cursor[key];
  });

  return next;
}

export function getFieldError(errors, path) {
  return errors?.[path] || '';
}

export function createSocialLink() {
  return { label: '', url: '' };
}
