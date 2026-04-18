import { useEffect } from 'react';
import { initHeader } from './header.js';

export function HeaderWrapper() {
  useEffect(() => {
    initHeader();
  }, []);

  return null;
}
