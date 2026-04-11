import { useEffect, useState } from 'react';
import { loadShellStatus } from '../state/shellState.js';

export function useShellStatus() {
  const [state, setState] = useState({
    loading: true,
    error: null,
    data: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const data = await loadShellStatus();
        if (!cancelled) {
          setState({ loading: false, error: null, data });
        }
      } catch (error) {
        if (!cancelled) {
          setState({ loading: false, error, data: null });
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
