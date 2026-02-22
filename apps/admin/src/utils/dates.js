import { format, formatDistanceToNowStrict, isValid, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export function safeParseISO(value) {
  if (typeof value !== 'string') return null;

  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

function normalizeToDate(value) {
  if (value instanceof Date) {
    return isValid(value) ? value : null;
  }

  if (typeof value === 'string') {
    return safeParseISO(value);
  }

  return null;
}

export function formatShortDateTime(isoOrDate) {
  const date = normalizeToDate(isoOrDate);
  if (!date) return '—';

  return format(date, 'dd/MM, HH:mm', { locale: es });
}

export function formatRelative(isoOrDate, now) {
  const date = normalizeToDate(isoOrDate);
  if (!date) return '—';

  const referenceDate = now instanceof Date && isValid(now) ? now : undefined;
  const relative = formatDistanceToNowStrict(date, {
    addSuffix: true,
    locale: es,
    ...(referenceDate ? { now: referenceDate.getTime() } : {}),
  });

  if (/^en menos de .*minuto/.test(relative) || /^hace menos de .*minuto/.test(relative)) {
    return 'recién';
  }

  return relative
    .replace(/^hace 1 minuto$/, 'hace 1 min')
    .replace(/^hace (\d+) minutos$/, 'hace $1 min')
    .replace(/^hace 1 hora$/, 'hace 1 h')
    .replace(/^hace (\d+) horas$/, 'hace $1 h')
    .replace(/^hace 1 día$/, 'hace 1 d')
    .replace(/^hace (\d+) días$/, 'hace $1 d');
}
