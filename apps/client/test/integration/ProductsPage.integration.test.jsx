import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ProductsPage } from '/src/react/pages/ProductsPage.jsx';

vi.mock('/src/react/services/publicApi.js', () => ({
  fetchPublicCategories: vi.fn(async () => [
    { id: 1, name: 'Mains' },
    { id: 2, name: 'Drinks' },
  ]),
  fetchPublicProducts: vi.fn(async () => [
    {
      id: 101,
      name: 'Burger',
      description: 'With fries',
      categoryId: 1,
      price: 1000,
      imageUrl: '/img/burger.jpg',
      offer: { discountPercent: 20 },
    },
    { id: 102, name: 'Soda', categoryId: 2, price: 500 },
  ]),
}));

vi.mock('/src/utils/cartService.js', () => ({
  addToCart: vi.fn(),
  getCart: vi.fn(() => []),
  updateQuantity: vi.fn(),
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

    fireEvent.change(screen.getByPlaceholderText('Search products'), {
      target: { value: 'pizza' },
    });

    expect(screen.getByText('No products match your current filters.')).toBeTruthy();
  });

  it('uses the shared card contract for discounted and regular products', async () => {
    const { addToCart, getCart, updateQuantity } = await import('/src/utils/cartService.js');
    addToCart.mockClear();
    getCart.mockReset().mockReturnValue([]);
    updateQuantity.mockClear();

    render(<ProductsPage />);

    const burgerTitle = await screen.findByRole('heading', { name: 'Burger' });
    const burgerCard = burgerTitle.closest('article');
    const burgerButton = within(burgerCard).getByRole('button', { name: 'Agregar al carrito' });
    const decreaseButton = within(burgerCard).getByRole('button', {
      name: 'Disminuir cantidad de Burger',
    });

    expect(within(burgerCard).getByText('-20%')).toBeTruthy();
    expect(decreaseButton.disabled).toBe(true);
    expect(burgerButton.className).toContain('btn-add-to-cart');
    expect(burgerButton.getAttribute('data-id')).toBe('101');
    expect(burgerButton.getAttribute('data-name')).toBe('Burger');
    expect(burgerButton.getAttribute('data-price')).toBe('800');
    expect(burgerButton.getAttribute('data-image')).toBe('/img/burger.jpg');
    expect(burgerButton.getAttribute('data-source')).toBe('products');

    fireEvent.click(burgerButton);

    expect(addToCart).toHaveBeenCalledWith({
      id: '101',
      name: 'Burger',
      price: 800,
      image: '/img/burger.jpg',
      source: 'products',
      quantity: 1,
    });

    const sodaCard = screen.getByRole('heading', { name: 'Soda' }).closest('article');
    expect(within(sodaCard).queryByText(/-\d+%/)).toBeNull();
    fireEvent.error(within(sodaCard).getByRole('img', { name: 'Soda' }));
    expect(
      within(sodaCard).getByRole('img', { name: 'Imagen no disponible para Soda' }),
    ).toBeTruthy();
  });

  it('passes selected quantity and applies it without changing cart service', async () => {
    const { addToCart, getCart, updateQuantity } = await import('/src/utils/cartService.js');
    addToCart.mockClear();
    getCart.mockReset().mockReturnValue([]);
    updateQuantity.mockClear();

    render(<ProductsPage />);

    const burgerCard = (await screen.findByRole('heading', { name: 'Burger' })).closest('article');
    const increaseButton = within(burgerCard).getByRole('button', {
      name: 'Aumentar cantidad de Burger',
    });

    fireEvent.click(increaseButton);
    fireEvent.click(increaseButton);
    fireEvent.click(within(burgerCard).getByRole('button', { name: 'Agregar al carrito' }));

    expect(addToCart).toHaveBeenCalledWith({
      id: '101',
      name: 'Burger',
      price: 800,
      image: '/img/burger.jpg',
      source: 'products',
      quantity: 3,
    });
    expect(updateQuantity).toHaveBeenCalledWith('101', 3);
  });
});
