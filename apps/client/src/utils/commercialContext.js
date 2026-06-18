import { isBusinessOpen } from '/src/utils/helpers.js';
import {
  compactDigits,
  loadPublicClientSettings,
} from '/src/react/settings/publicClientSettings.js';

const COMMERCIAL_CONTEXT_ERROR = 'Commercial information is temporarily unavailable.';

export function sanitizeWhatsappNumber(value) {
  return compactDigits(value);
}

export function getCommercialContextErrorMessage(error) {
  const detail = error && typeof error.message === 'string' ? error.message.trim() : '';
  if (!detail) return COMMERCIAL_CONTEXT_ERROR;
  return `${COMMERCIAL_CONTEXT_ERROR} ${detail}`;
}

export async function loadCommercialContext() {
  try {
    const context = await loadPublicClientSettings();
    let businessOpen = context.isOpen;

    if (context.errors.businessStatus) {
      businessOpen = await isBusinessOpen();
    }

    const contextError =
      context.errors.businessStatus || context.errors.settings || context.errors.commercialConfig;

    return {
      businessOpen,
      whatsappMessageCta: context.whatsapp.messageCta,
      whatsappNumber: context.whatsapp.numberDigits,
      errorMessage: contextError ? getCommercialContextErrorMessage(contextError) : '',
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
