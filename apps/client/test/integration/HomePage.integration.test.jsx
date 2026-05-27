import { beforeEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { HomePage } from '/src/react/pages/HomePage.jsx';
import {
  fetchBusinessStatus,
  fetchCommercialConfig,
  fetchPublicCategories,
  fetchPublicOffers,
  fetchPublicSettings,
} from '/src/react/services/publicApi.js';

vi.mock('/src/react/services/publicApi.js', () => ({
  fetchPublicSettings: vi.fn(),
  fetchBusinessStatus: vi.fn(),
  fetchCommercialConfig: vi.fn(),
  fetchPublicOffers: vi.fn(),
  fetchPublicCategories: vi.fn(),
}));

describe('HomePage integration baseline', () => {
  beforeEach(() => {
    fetchPublicSettings.mockReset().mockResolvedValue({
      brandName: 'La Fileto',
      heroTitle: 'Sabor de barrio, recién hecho',
    });
    fetchBusinessStatus.mockReset().mockResolvedValue({ isOpen: true, message: 'Abierto hoy' });
    fetchCommercialConfig.mockReset().mockResolvedValue({ whatsapp: { number: '+5411' } });
    fetchPublicOffers.mockReset().mockResolvedValue([]);
    fetchPublicCategories.mockReset().mockResolvedValue([]);
    window.location.hash = '';
  });

  it('renders accessible section headings and empty states in Spanish', async () => {
    render(<HomePage />);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sabor de barrio, recién hecho' }),
    ).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: 'Cómo pedir' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: 'Ofertas destacadas' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: 'Categorías destacadas' })).toBeTruthy();
    expect(await screen.findByText('No hay ofertas activas por ahora.')).toBeTruthy();
    expect(await screen.findByText('Todavía no hay categorías para mostrar.')).toBeTruthy();
  });

  it('navigates to products from the primary hero CTA', () => {
    render(<HomePage />);

    fireEvent.click(screen.getByRole('button', { name: 'Ver menú' }));

    expect(window.location.hash).toBe('#products');
  });

  it('preserves offer cart attributes, storage and update event', async () => {
    fetchPublicOffers.mockResolvedValueOnce([
      {
        id: 7,
        discountPercent: 20,
        product: {
          id: 10,
          name: 'Milanesa completa',
          price: 10000,
          imageUrl: '/img/hero1.png',
        },
      },
    ]);
    document.body.innerHTML = '<span id="cart-count">0</span>';
    const cartUpdated = vi.fn();
    document.addEventListener('cart:updated', cartUpdated, { once: true });

    render(<HomePage />);

    const button = await screen.findByRole('button', { name: 'Agregar al carrito' });
    expect(button.closest('article')?.getAttribute('data-offer-slide')).toBe('0');
    expect(button.className).toContain('btn-add-to-cart');
    expect(button.getAttribute('data-id')).toBe('10');
    expect(button.getAttribute('data-name')).toBe('Milanesa completa');
    expect(button.getAttribute('data-price')).toBe('8000');
    expect(button.getAttribute('data-image')).toBe('/img/hero1.png');
    expect(button.getAttribute('data-source')).toBe('offers');

    fireEvent.click(button);

    expect(JSON.parse(localStorage.getItem('cart') || '[]')).toEqual([
      {
        id: '10',
        name: 'Milanesa completa',
        price: 8000,
        image: '/img/hero1.png',
        source: 'offers',
        quantity: 1,
      },
    ]);
    expect(document.getElementById('cart-count').textContent).toBe('1');
    expect(cartUpdated).toHaveBeenCalledTimes(1);
  });

  it('adds the selected offer quantity through the shared stepper', async () => {
    fetchPublicOffers.mockResolvedValueOnce([
      {
        id: 8,
        discountPercent: 10,
        product: {
          id: 11,
          name: 'Promo familiar',
          price: 12000,
          imageUrl: '/img/hero1.png',
        },
      },
    ]);
    document.body.innerHTML = '<span id="cart-count">0</span>';

    render(<HomePage />);

    const addButton = await screen.findByRole('button', { name: 'Agregar al carrito' });
    const increaseButton = screen.getByRole('button', {
      name: 'Aumentar cantidad de Promo familiar',
    });

    fireEvent.click(increaseButton);
    fireEvent.click(increaseButton);
    fireEvent.click(addButton);

    expect(JSON.parse(localStorage.getItem('cart') || '[]')[0].quantity).toBe(3);
    expect(document.getElementById('cart-count').textContent).toBe('3');
  });

  it('limits featured categories to four editorial links', async () => {
    fetchPublicCategories.mockResolvedValueOnce(
      ['Bebidas', 'Carnes', 'Ensaladas', 'Pastas', 'Pizzas'].map((name, index) => ({
        id: index + 1,
        name,
        isActive: true,
      })),
    );

    render(<HomePage />);

    expect(await screen.findByRole('link', { name: 'Ver productos de Bebidas' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Ver productos de Pastas' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Ver productos de Pizzas' })).toBeNull();
  });

  it('shows a localized controlled error when offers cannot load', async () => {
    fetchPublicOffers.mockRejectedValueOnce(new Error('Temporalmente sin conexión'));

    render(<HomePage />);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('No pudimos cargar ofertas');
    expect(alert.textContent).toContain('Temporalmente sin conexión');
  });
});
