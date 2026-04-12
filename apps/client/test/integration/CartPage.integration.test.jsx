import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CartPage } from '/src/react/pages/CartPage.jsx';

vi.mock('/src/utils/commercialContext.js', () => ({
  loadCommercialContext: vi.fn(async () => ({
    businessOpen: true,
    whatsappNumber: '5491111111111',
    errorMessage: '',
  })),
}));

vi.mock('/src/utils/showSnackbar.js', () => ({
  showSnackbar: vi.fn(),
}));

function seedCart(items) {
  localStorage.setItem('cart', JSON.stringify(items));
}

describe('CartPage integration', () => {
  beforeEach(() => {
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  it('updates quantity and recalculates total using real cart storage wiring', async () => {
    seedCart([{ id: 'p1', name: 'Milanesa', price: 1000, quantity: 1 }]);

    render(<CartPage />);

    expect(screen.getByText((_content, node) => node?.id === 'cart-total' && node.textContent.includes('1.000'))).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /increase quantity/i }));

    await waitFor(() => {
      expect(screen.getByText((_content, node) => node?.id === 'cart-total' && node.textContent.includes('2.000'))).toBeTruthy();
    });

    const stored = JSON.parse(localStorage.getItem('cart') || '[]');
    expect(stored[0].quantity).toBe(2);
  });

  it('removes an item and keeps remaining totals stable', async () => {
    seedCart([
      { id: 'p1', name: 'Milanesa', price: 1000, quantity: 1 },
      { id: 'p2', name: 'Papas', price: 500, quantity: 1 },
    ]);

    render(<CartPage />);

    fireEvent.click(screen.getByRole('button', { name: /remove milanesa from cart/i }));

    await waitFor(() => {
      expect(screen.queryByText('Milanesa')).toBeNull();
    });

    expect(screen.getByText('Papas')).toBeTruthy();
    expect(screen.getByText((_content, node) => node?.id === 'cart-total' && node.textContent.includes('500'))).toBeTruthy();
  });

  it('clears the cart and returns to the empty-state safely', async () => {
    seedCart([{ id: 'p1', name: 'Milanesa', price: 1000, quantity: 1 }]);

    render(<CartPage />);

    fireEvent.click(screen.getByRole('button', { name: /clear cart/i }));

    await waitFor(() => {
      expect(screen.getByText('Your cart is empty')).toBeTruthy();
    });

    expect(JSON.parse(localStorage.getItem('cart') || '[]')).toEqual([]);
  });

  it('blocks confirm action when business is closed', async () => {
    const { loadCommercialContext } = await import('/src/utils/commercialContext.js');
    loadCommercialContext.mockResolvedValueOnce({
      businessOpen: false,
      whatsappNumber: '',
      errorMessage: '',
    });

    seedCart([{ id: 'p1', name: 'Milanesa', price: 1000, quantity: 1 }]);

    render(<CartPage />);

    const confirmLink = await screen.findByRole('link', { name: /confirm order/i });
    expect(confirmLink.getAttribute('aria-disabled')).toBe('true');

    fireEvent.click(confirmLink);

    await waitFor(() => {
      expect(screen.getAllByText('We are currently closed.').length).toBeGreaterThan(0);
    });
  });
});
