import { prisma } from '../config/prisma.js';
import { settingsService } from './settingsService.js';
import { SITE_CONFIG_DEFAULTS } from '../settings/siteConfigDefaults.js';

const FORCE_OPEN = 'FORCE_OPEN';
const FORCE_CLOSED = 'FORCE_CLOSED';
const AUTO = 'AUTO';

function parseTimeToMinutes(value) {
  if (typeof value !== 'string') return null;
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return hours * 60 + minutes;
}

function getNowInTimezone(timezone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: timezone
  });

  const parts = formatter.formatToParts(new Date());
  const weekday = parts.find((part) => part.type === 'weekday')?.value?.toLowerCase?.() ?? '';
  const hour = Number(parts.find((part) => part.type === 'hour')?.value);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value);

  return {
    weekday,
    minutes: (Number.isInteger(hour) ? hour : 0) * 60 + (Number.isInteger(minute) ? minute : 0)
  };
}

function normalizeTimezone(value) {
  const raw = typeof value === 'string' ? value.trim() : '';
  return raw || SITE_CONFIG_DEFAULTS.hours.timezone;
}

export function computeIsOpenFromHours(hoursConfig = {}) {
  const override = typeof hoursConfig.override === 'string' ? hoursConfig.override.trim() : AUTO;

  if (override === FORCE_OPEN) return true;
  if (override === FORCE_CLOSED) return false;

  const openingHours = Array.isArray(hoursConfig.openingHours) ? hoursConfig.openingHours : [];
  if (openingHours.length === 0) return false;

  const timezone = normalizeTimezone(hoursConfig.timezone);

  let now;
  try {
    now = getNowInTimezone(timezone);
  } catch {
    now = getNowInTimezone(SITE_CONFIG_DEFAULTS.hours.timezone);
  }

  const daySlots = openingHours.filter((slot) => {
    const day = typeof slot?.day === 'string' ? slot.day.trim().toLowerCase() : '';
    return day === now.weekday;
  });

  return daySlots.some((slot) => {
    if (slot?.closed) return false;

    const open = parseTimeToMinutes(slot?.open);
    const close = parseTimeToMinutes(slot?.close);

    if (open === null || close === null || open >= close) {
      return false;
    }

    return now.minutes >= open && now.minutes < close;
  });
}

export const dashboardService = {
  async getAdminSummary() {
    const [activeProducts, activeCategories, offersByProduct, settings] = await Promise.all([
      prisma.product.count({ where: { status: 'ACTIVE' } }),
      prisma.category.count({ where: { active: true } }),
      prisma.offer.groupBy({
        by: ['productId']
      }),
      settingsService.getAdminSettings()
    ]);

    const mode = settings?.hours?.override || AUTO;
    const isOpen = computeIsOpenFromHours(settings?.hours);

    return {
      counts: {
        activeProducts,
        activeCategories,
        activeOffers: offersByProduct.length
      },
      status: {
        mode,
        isOpen
      }
    };
  }
};
