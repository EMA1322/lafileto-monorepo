import { useEffect, useState } from 'react';
import {
  getBrandLogoFromEvent,
  readCachedBrandLogo,
  SETTINGS_BRAND_LOGO_EVENT,
} from './headerBranding.helpers.js';

export default function useHeaderBranding() {
  const [logoUrl, setLogoUrl] = useState(() => readCachedBrandLogo());
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    const onLogoUpdate = (event) => {
      setLogoFailed(false);
      setLogoUrl(getBrandLogoFromEvent(event) || readCachedBrandLogo());
    };

    document.addEventListener(SETTINGS_BRAND_LOGO_EVENT, onLogoUpdate);
    return () => {
      document.removeEventListener(SETTINGS_BRAND_LOGO_EVENT, onLogoUpdate);
    };
  }, []);

  return {
    logoUrl: logoFailed ? '' : logoUrl,
    onLogoError: () => setLogoFailed(true),
  };
}
