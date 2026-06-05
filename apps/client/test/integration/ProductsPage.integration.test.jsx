import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ProductsPage } from '/src/react/pages/ProductsPage.jsx';
import { fetchPublicCategories, fetchPublicProducts } from '/src/react/services/publicApi.js';

vi.mock('/src/react/services/publicApi.js', () => ({
  fetchPublicCategories: vi.fn(),
  fetchPublicProducts: vi.fn(),
}));

vi.mock('/src/utils/cartService.js', () => ({
  addToCart: vi.fn(),
  getCart: vi.fn(() => []),
  updateQuantity: vi.fn(),
}));

vi.mock('/src/utils/showSnackbar.js', () => ({
  showSnackbar: vi.fn(),
}));

function loadDefaultCatalog() {
  fetchPublicCategories.mockResolvedValue([
    { id: 1, name: 'Principales', isActive: true },
    { id: 2, name: 'Bebidas', isActive: true },
    { id: 3, name: 'Pizzas', isActive: true },
    { id: 4, name: 'Oculta', isActive: false },
    { id: 5, name: 'Carnes', isActive: true },
  ]);
  fetchPublicProducts.mockResolvedValue([
    {
      id: 101,
      name: 'Burger',
      description: 'Con papas',
      categoryId: 1,
      price: 1000,
      imageUrl: '/img/burger.jpg',
      offer: { discountPercent: 20 },
    },
    { id: 102, name: 'Soda', description: 'Bebida fría', categoryId: 2, price: 500 },
    { id: 103, name: 'Coca Cola', description: 'Gaseosa clásica', categoryId: 2, price: 700 },
    { id: 104, name: 'Agua mineral', description: 'Sin gas', categoryId: 2, price: 450 },
    { id: 105, name: 'Milanesa', description: 'Con puré', categoryId: 1, price: 1800 },
    { id: 106, name: 'Pizza muzzarella', description: 'Salsa y queso', categoryId: 3, price: 2200 },
    { id: 107, name: 'Empanada carne', description: 'Al horno', categoryId: 1, price: 600 },
    {
      id: 108,
      name: 'Pizza fugazzeta',
      description: 'Cebolla y queso',
      categoryId: 3,
      price: 2400,
    },
  ]);
}

describe('ProductsPage integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadDefaultCatalog();
  });

  it('renders localized editorial controls and active category chips', async () => {
    render(<ProductsPage />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Nuestro menú' })).toBeTruthy();
    expect(screen.getByLabelText('Buscar productos')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Todos' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'En oferta' }).getAttribute('aria-pressed')).toBe(
      'false',
    );
    expect(screen.getByRole('button', { name: 'Principales' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pizzas' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Oculta' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Carnes' })).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('Mostrando 1-6 de 8 productos');
  });

  it('renders foundation loading, error and empty catalog states in Spanish', async () => {
    let resolveCategories;
    fetchPublicCategories.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveCategories = resolve;
      }),
    );

    const { unmount } = render(<ProductsPage />);
    expect(screen.getByText('Cargando catálogo')).toBeTruthy();
    resolveCategories([]);
    unmount();

    fetchPublicProducts.mockRejectedValueOnce(new Error('Sin conexión'));
    render(<ProductsPage />);
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('No pudimos cargar el catálogo');
    expect(alert.textContent).toContain('Sin conexión');
  });

  it('handles an empty catalog without rendering product cards', async () => {
    fetchPublicProducts.mockResolvedValueOnce([]);

    render(<ProductsPage />);

    expect(await screen.findByText('No hay productos disponibles')).toBeTruthy();
    expect(screen.queryByLabelText('Productos disponibles')).toBeNull();
  });

  it('combines search and category filters and clears an empty result', async () => {
    render(<ProductsPage />);

    expect(await screen.findByText('Burger')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Bebidas' }));
    expect(screen.queryByText('Burger')).toBeNull();
    expect(screen.getByText('Soda')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Buscar productos'), {
      target: { value: 'burger' },
    });

    expect(screen.getByText('No encontramos resultados')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(screen.getByText('Burger')).toBeTruthy();
    expect(screen.getByText('Soda')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Todos' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('status').textContent).toContain('Mostrando 1-6 de 8 productos');
  });

  it('matches search queries without accents against accented product text', async () => {
    render(<ProductsPage />);

    expect(await screen.findByText('Milanesa')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Buscar productos'), {
      target: { value: 'pure' },
    });

    expect(screen.getByText('Milanesa')).toBeTruthy();
    expect(screen.queryByText('Burger')).toBeNull();

    fireEvent.change(screen.getByLabelText('Buscar productos'), {
      target: { value: 'clasica' },
    });

    expect(screen.getByText('Coca Cola')).toBeTruthy();
    expect(screen.queryByText('Milanesa')).toBeNull();
  });

  it('filters highlighted offers and combines them with search', async () => {
    render(<ProductsPage />);

    expect(await screen.findByText('Burger')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'En oferta' }));

    expect(screen.getByRole('button', { name: 'En oferta' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(screen.getByText('Burger')).toBeTruthy();
    expect(screen.queryByText('Soda')).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('Mostrando 1-1 de 1 productos');

    fireEvent.change(screen.getByLabelText('Buscar productos'), {
      target: { value: 'soda' },
    });

    expect(screen.getByText('No encontramos resultados')).toBeTruthy();
    expect(screen.getAllByRole('status')[0].textContent).toContain('0 productos encontrados');

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(screen.getByRole('button', { name: 'Todos' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('Burger')).toBeTruthy();
    expect(screen.getByText('Soda')).toBeTruthy();
  });

  it('paginates filtered products locally with previous and next controls', async () => {
    render(<ProductsPage />);

    expect(await screen.findByText('Burger')).toBeTruthy();
    expect(screen.queryByText('Empanada carne')).toBeNull();

    const previousButton = screen.getByRole('button', {
      name: 'Ver página anterior de productos',
    });
    const nextButton = screen.getByRole('button', {
      name: 'Ver página siguiente de productos',
    });

    expect(previousButton.disabled).toBe(true);
    expect(nextButton.disabled).toBe(false);
    expect(screen.getByText('Página 1 de 2')).toBeTruthy();

    fireEvent.click(nextButton);

    expect(screen.getByText('Empanada carne')).toBeTruthy();
    expect(screen.getByText('Pizza fugazzeta')).toBeTruthy();
    expect(screen.queryByText('Burger')).toBeNull();
    expect(screen.getByText('Página 2 de 2')).toBeTruthy();
    expect(nextButton.disabled).toBe(true);
    expect(previousButton.disabled).toBe(false);

    fireEvent.click(previousButton);
    expect(screen.getByText('Burger')).toBeTruthy();
    expect(screen.getByText('Página 1 de 2')).toBeTruthy();
  });

  it('resets pagination to the first page when search changes', async () => {
    render(<ProductsPage />);

    expect(await screen.findByText('Burger')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Ver página siguiente de productos' }));
    expect(screen.getByText('Página 2 de 2')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Buscar productos'), {
      target: { value: 'pizza' },
    });

    expect(screen.queryByText('Página 2 de 2')).toBeNull();
    expect(screen.getByText('Mostrando 1-2 de 2 productos')).toBeTruthy();
    expect(screen.getByText('Pizza muzzarella')).toBeTruthy();
    expect(screen.getByText('Pizza fugazzeta')).toBeTruthy();
  });

  it('resets pagination to the first page when category changes', async () => {
    render(<ProductsPage />);

    expect(await screen.findByText('Burger')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Ver página siguiente de productos' }));
    expect(screen.getByText('Página 2 de 2')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Bebidas' }));

    expect(screen.queryByText('Página 2 de 2')).toBeNull();
    expect(screen.getByText('Mostrando 1-3 de 3 productos')).toBeTruthy();
    expect(screen.getByText('Soda')).toBeTruthy();
    expect(screen.getByText('Coca Cola')).toBeTruthy();
    expect(screen.getByText('Agua mineral')).toBeTruthy();
  });

  it('keeps the shared card attributes and add-to-cart payload for products', async () => {
    const { addToCart, getCart } = await import('/src/utils/cartService.js');
    getCart.mockReturnValue([]);

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
  });

  it('passes selected quantity without changing cart service behavior', async () => {
    const { addToCart, getCart, updateQuantity } = await import('/src/utils/cartService.js');
    getCart.mockReturnValue([]);

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
