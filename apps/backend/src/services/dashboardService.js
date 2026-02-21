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

function getLocalDateParts(date, timezone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);

  return { year, month, day };
}

function getOffsetMs(date, timezone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value);
  const second = Number(parts.find((part) => part.type === 'second')?.value);

  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return asUtc - date.getTime();
}

function zonedDateTimeToUtcIso({ year, month, day, minutes }, timezone) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hours, mins, 0));
  const offsetMs = getOffsetMs(utcGuess, timezone);
  return new Date(utcGuess.getTime() - offsetMs).toISOString();
}

function getBusinessStatusFromHours(hoursConfig = {}) {
  const timezone = normalizeTimezone(hoursConfig.timezone);
  const override = typeof hoursConfig.override === 'string' ? hoursConfig.override.trim() : AUTO;

  if (override === FORCE_OPEN) {
    return { isOpen: true, nextChangeAt: null };
  }

  if (override === FORCE_CLOSED) {
    return { isOpen: false, nextChangeAt: null };
  }

  const openingHours = Array.isArray(hoursConfig.openingHours) ? hoursConfig.openingHours : [];
  if (openingHours.length === 0) {
    return { isOpen: false, nextChangeAt: null };
  }

  let now;
  try {
    now = getNowInTimezone(timezone);
  } catch {
    now = getNowInTimezone(SITE_CONFIG_DEFAULTS.hours.timezone);
  }

  const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDayIndex = weekdays.indexOf(now.weekday);

  if (currentDayIndex === -1) {
    return { isOpen: computeIsOpenFromHours(hoursConfig), nextChangeAt: null };
  }

  const slotsByDay = weekdays.map((weekday) =>
    openingHours
      .filter((slot) => (typeof slot?.day === 'string' ? slot.day.trim().toLowerCase() : '') === weekday)
      .map((slot) => ({
        open: parseTimeToMinutes(slot?.open),
        close: parseTimeToMinutes(slot?.close),
        closed: Boolean(slot?.closed)
      }))
      .filter((slot) => !slot.closed && slot.open !== null && slot.close !== null && slot.open < slot.close)
      .sort((a, b) => a.open - b.open)
  );

  const localDate = getLocalDateParts(new Date(), timezone);
  const baseDateUtc = new Date(Date.UTC(localDate.year, localDate.month - 1, localDate.day, 12, 0, 0));

  for (let dayOffset = 0; dayOffset < 8; dayOffset += 1) {
    const dayIndex = (currentDayIndex + dayOffset) % 7;
    const slots = slotsByDay[dayIndex] || [];

    for (const slot of slots) {
      const isCurrentDay = dayOffset === 0;
      const changeMinute = isCurrentDay && now.minutes >= slot.open && now.minutes < slot.close
        ? slot.close
        : slot.open;

      if (isCurrentDay && now.minutes >= slot.close) {
        continue;
      }

      if (isCurrentDay && now.minutes < slot.open) {
        const targetDate = new Date(baseDateUtc);
        targetDate.setUTCDate(targetDate.getUTCDate() + dayOffset);
        const targetParts = getLocalDateParts(targetDate, timezone);
        return {
          isOpen: false,
          nextChangeAt: zonedDateTimeToUtcIso({ ...targetParts, minutes: changeMinute }, timezone)
        };
      }

      if (isCurrentDay && now.minutes >= slot.open && now.minutes < slot.close) {
        const targetDate = new Date(baseDateUtc);
        targetDate.setUTCDate(targetDate.getUTCDate() + dayOffset);
        const targetParts = getLocalDateParts(targetDate, timezone);
        return {
          isOpen: true,
          nextChangeAt: zonedDateTimeToUtcIso({ ...targetParts, minutes: changeMinute }, timezone)
        };
      }

      if (!isCurrentDay) {
        const targetDate = new Date(baseDateUtc);
        targetDate.setUTCDate(targetDate.getUTCDate() + dayOffset);
        const targetParts = getLocalDateParts(targetDate, timezone);
        return {
          isOpen: false,
          nextChangeAt: zonedDateTimeToUtcIso({ ...targetParts, minutes: slot.open }, timezone)
        };
      }
    }
  }

  return {
    isOpen: false,
    nextChangeAt: null
  };
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
    const [activeProducts, activeCategories, activeOffers, productsWithoutImage, settings] = await Promise.all([
      prisma.product.count({ where: { status: 'ACTIVE' } }),
      prisma.category.count({ where: { active: true } }),
      prisma.offer.count({
        where: {
          product: { status: 'ACTIVE' }
        }
      }),
      prisma.product.count({
        where: {
          OR: [
            { imageUrl: null },
            { imageUrl: '' }
          ]
        }
      }),
      settingsService.getAdminSettings()
    ]);

    const mode = settings?.hours?.override || AUTO;
    const businessStatus = getBusinessStatusFromHours(settings?.hours);
    const offerPercentRaw = activeProducts > 0 ? (activeOffers / activeProducts) * 100 : 0;
    const offerPercent = Math.round(offerPercentRaw * 10) / 10;

    return {
      meta: {
        generatedAt: new Date().toISOString()
      },
      counts: {
        activeProducts,
        activeCategories,
        activeOffers,
        productsWithoutImage
      },
      insights: {
        offersActive: activeOffers,
        offerPercent
      },
      business: {
        isOpen: businessStatus.isOpen,
        nextChangeAt: businessStatus.nextChangeAt
      },
      activity: {
        items: [],
        note: 'Activity feed not implemented yet'
      },
      status: {
        mode,
        isOpen: businessStatus.isOpen
      }
    };
  }
};
