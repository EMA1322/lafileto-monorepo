import { useEffect } from 'react';
import { initFooter } from './footer.js';

export function FooterWrapper() {
  useEffect(() => {
    initFooter();
  }, []);

  return null;
}
