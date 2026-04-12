import { fetchBusinessStatus } from '../services/publicApi.js';

export async function loadShellStatus() {
  const status = await fetchBusinessStatus();
  return {
    isOpen: Boolean(status?.isOpen),
    status,
  };
}
