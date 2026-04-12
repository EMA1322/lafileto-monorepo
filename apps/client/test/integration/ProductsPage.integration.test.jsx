import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductsPage } from '/src/react/pages/ProductsPage.jsx';

vi.mock('/src/react/services/publicApi.js', () => ({
  fetchPublicCategories: vi.fn(async () => [{ id: 1, name: 'Mains' }, { id: 2, name: 'Drinks' }]),
  fetchPublicProducts: vi.fn(async () => [
    { id: 101, name: 'Burger', description: 'With fries', categoryId: 1, price: 1000 },
    { id: 102, name: 'Soda', categoryId: 2, price: 500 },
  ]),
}));

vi.mock('/src/utils/cartService.js', () => ({
  addToCart: vi.fn(),
}));

vi.mock('/src/utils/showSnackbar.js', () => ({
  showSnackbar: vi.fn(),
}));

describe('ProductsPage integration baseline', () => {
  it('handles empty catalog without crashing', async () => {
    const { fetchPublicProducts } = await import('/src/react/services/publicApi.js');
    fetchPublicProducts.mockResolvedValueOnce([]);

    render(<ProductsPage />);
    expect(await screen.findByText('There are no products available right now.')).toBeTruthy();
  });

  it('supports search/filter path and empty results message', async () => {
    render(<ProductsPage />);

    expect(await screen.findByText('Burger')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('Search products'), { target: { value: 'pizza' } });

    expect(screen.getByText('No products match your current filters.')).toBeTruthy();
  });
});
