/**
 * Formatea valores numéricos como moneda usando Intl.NumberFormat.
 * Permite ajustar fracciones mínimas/máximas sin forzar a los consumidores.
 *
 * @param {number|string} value
 * @param {{
 *   locale?: string,
 *   currency?: string,
 *   minimumFractionDigits?: number,
 *   maximumFractionDigits?: number,
 * }} [options]
 * @returns {string}
 */
export function formatCurrency(value, options = {}) {
  const {
    locale = 'es-AR',
    currency = 'ARS',
    minimumFractionDigits,
    maximumFractionDigits,
  } = options;

  try {
    const formatterOptions = {
      style: 'currency',
      currency,
    };

    if (typeof minimumFractionDigits === 'number') {
      formatterOptions.minimumFractionDigits = minimumFractionDigits;
    }

    if (typeof maximumFractionDigits === 'number') {
      formatterOptions.maximumFractionDigits = maximumFractionDigits;
    }

    return new Intl.NumberFormat(locale, formatterOptions).format(value);
  } catch (error) {
    console.error('[shared-utils] formatCurrency failed:', error);
    return String(value ?? '');
  }
}
