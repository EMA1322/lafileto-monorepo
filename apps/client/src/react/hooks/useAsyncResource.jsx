import { useEffect, useState } from 'react';

export function useAsyncResource(loader, deps = []) {
  const [state, setState] = useState({
    status: 'loading',
    data: null,
    error: null,
  });

  useEffect(() => {
    let active = true;

    async function run() {
      setState({ status: 'loading', data: null, error: null });
      try {
        const data = await loader();
        if (!active) return;
        setState({ status: 'success', data, error: null });
      } catch (error) {
        if (!active) return;
        setState({ status: 'error', data: null, error });
      }
    }

    run();

    return () => {
      active = false;
    };
  }, deps);

  return state;
}
