import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CartPage } from '/src/react/pages/CartPage.jsx';

vi.mock('/src/utils/cartService.js', () => ({
  clearCart: vi.fn(),
  removeFromCart: vi.fn(),
  updateQuantity: vi.fn(),
  getCart: vi.fn(() => []),
}));

vi.mock('/src/utils/helpers.js', async () => {
  const actual = await vi.importActual('/src/utils/helpers.js');
  return {
    ...actual,
    isBusinessOpen: vi.fn(async () => true),
  };
});

vi.mock('/src/utils/showSnackbar.js', () => ({
  showSnackbar: vi.fn(),
}));

describe('CartPage integration baseline', () => {
  it('renders empty cart from local state safely', async () => {
    render(<CartPage />);

    expect(screen.getByText('Your cart is empty')).toBeTruthy();
    expect(screen.getByText((_content, node) => node?.id === 'cart-total' && node.textContent.includes('0'))).toBeTruthy();
  });
});
