import { fetchBusinessStatus, fetchCommercialConfig } from '/src/api/public.js';
import { isBusinessOpen } from '/src/utils/helpers.js';

const COMMERCIAL_CONTEXT_ERROR = 'Commercial information is temporarily unavailable.';

export function sanitizeWhatsappNumber(value) {
  return String(value || '').replace(/\D/g, '');
}

export function getCommercialContextErrorMessage(error) {
  const detail = error && typeof error.message === 'string' ? error.message.trim() : '';
  if (!detail) return COMMERCIAL_CONTEXT_ERROR;
  return `${COMMERCIAL_CONTEXT_ERROR} ${detail}`;
}

export async function loadCommercialContext() {
  try {
    const [status, commercialConfig] = await Promise.all([
      fetchBusinessStatus(),
      fetchCommercialConfig(),
    ]);

    return {
      businessOpen: status?.isOpen === true,
      whatsappNumber: sanitizeWhatsappNumber(commercialConfig?.whatsapp?.number),
      errorMessage: '',
    };
  } catch (error) {
    try {
      const fallbackOpen = await isBusinessOpen();
      return {
        businessOpen: fallbackOpen,
        whatsappNumber: '',
        errorMessage: getCommercialContextErrorMessage(error),
      };
    } catch (fallbackError) {
      return {
        businessOpen: false,
        whatsappNumber: '',
        errorMessage: getCommercialContextErrorMessage(fallbackError),
      };
    }
  }
}
