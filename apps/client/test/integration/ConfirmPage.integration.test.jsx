import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConfirmPage } from '/src/react/pages/ConfirmPage.jsx';

vi.mock('/src/utils/cartService.js', () => ({
  clearCart: vi.fn(),
  getCart: vi.fn(() => []),
}));

vi.mock('/src/api/public.js', () => ({
  fetchBusinessStatus: vi.fn(async () => ({ isOpen: false, reason: 'Closed now' })),
  fetchCommercialConfig: vi.fn(async () => ({ whatsapp: { number: '' } })),
}));

vi.mock('/src/utils/helpers.js', async () => {
  const actual = await vi.importActual('/src/utils/helpers.js');
  return {
    ...actual,
    isBusinessOpen: vi.fn(async () => false),
  };
});

vi.mock('/src/utils/showSnackbar.js', () => ({
  showSnackbar: vi.fn(),
}));

describe('ConfirmPage integration baseline', () => {
  it('stays stable with empty cart, closed business and missing commercial config', async () => {
    render(<ConfirmPage />);

    expect(screen.getByText('Your cart is empty.')).toBeTruthy();

    const sendButton = await screen.findByRole('button', { name: /send via whatsapp/i });
    expect(sendButton.disabled).toBe(true);

    const closedNote = screen.getByText('We are currently closed.');
    expect(closedNote.hidden).toBe(false);
  });
});
