import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ConfirmPage } from '/src/react/pages/ConfirmPage.jsx';

vi.mock('/src/api/public.js', () => ({
  fetchBusinessStatus: vi.fn(async () => ({ isOpen: true })),
  fetchCommercialConfig: vi.fn(async () => ({ whatsapp: { number: '+54 9 11 1234-5678' } })),
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

function seedCart(items) {
  localStorage.setItem('cart', JSON.stringify(items));
}

describe('ConfirmPage integration', () => {
  beforeEach(() => {
    vi.stubGlobal('open', vi.fn());
  });

  it('sends a valid order when cart, business status and commercial config are valid', async () => {
    seedCart([{ id: 'p1', name: 'Milanesa', price: 1000, quantity: 2 }]);

    render(<ConfirmPage />);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ana' } });

    const sendButton = await screen.findByRole('button', { name: /send via whatsapp/i });
    await waitFor(() => expect(sendButton.disabled).toBe(false));

    fireEvent.click(sendButton);

    expect(window.open).toHaveBeenCalledTimes(1);
    expect(window.open.mock.calls[0][0]).toContain('https://wa.me/5491112345678?text=');
    expect(JSON.parse(localStorage.getItem('cart') || '[]')).toEqual([]);
    expect(screen.getByText('Order sent via WhatsApp. Cart cleared.')).toBeTruthy();
  });

  it('keeps submit disabled when business is closed', async () => {
    const { fetchBusinessStatus } = await import('/src/api/public.js');
    fetchBusinessStatus.mockResolvedValueOnce({ isOpen: false });

    seedCart([{ id: 'p1', name: 'Milanesa', price: 1000, quantity: 1 }]);

    render(<ConfirmPage />);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ana' } });

    const sendButton = await screen.findByRole('button', { name: /send via whatsapp/i });
    expect(sendButton.disabled).toBe(true);

    const closedNote = screen.getByText('We are currently closed.');
    expect(closedNote.hidden).toBe(false);
  });

  it('keeps submit disabled when WhatsApp number is missing', async () => {
    const { fetchCommercialConfig } = await import('/src/api/public.js');
    fetchCommercialConfig.mockResolvedValueOnce({ whatsapp: { number: '' } });

    seedCart([{ id: 'p1', name: 'Milanesa', price: 1000, quantity: 1 }]);

    render(<ConfirmPage />);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ana' } });

    const sendButton = await screen.findByRole('button', { name: /send via whatsapp/i });
    expect(sendButton.disabled).toBe(true);
    expect(screen.getByText('This is the message that will be sent to WhatsApp.')).toBeTruthy();
  });

  it('applies fallback business status and shows a uniform commercial-context error message', async () => {
    const { fetchBusinessStatus, fetchCommercialConfig } = await import('/src/api/public.js');
    const { isBusinessOpen } = await import('/src/utils/helpers.js');

    fetchBusinessStatus.mockRejectedValueOnce(new Error('status unavailable'));
    fetchCommercialConfig.mockRejectedValueOnce(new Error('config unavailable'));
    isBusinessOpen.mockResolvedValueOnce(true);

    seedCart([{ id: 'p1', name: 'Milanesa', price: 1000, quantity: 1 }]);

    render(<ConfirmPage />);

    const status = await screen.findByText(/commercial information is temporarily unavailable/i);
    expect(status.textContent).toContain('status unavailable');

    const closedNote = screen.getByText('We are currently closed.');
    expect(closedNote.hidden).toBe(true);
  });
});
