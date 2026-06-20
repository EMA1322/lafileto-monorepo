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

function seedCart(items) {
  localStorage.setItem('cart', JSON.stringify(items));
}

function getStoredCart() {
  return JSON.parse(localStorage.getItem('cart') || '[]');
}

describe('CartPage integration', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );
    window.location.hash = '';
    document.body.innerHTML = '';
  });

  it('renders a professional empty state with menu CTA and no confirm action', async () => {
    render(<CartPage />);

    expect(await screen.findByRole('heading', { name: /te falta elegir algo rico/i })).toBeTruthy();

    const productsLink = screen.getByRole('link', { name: /ver menú/i });
    expect(productsLink.getAttribute('href')).toBe('#products');
    expect(screen.queryByRole('link', { name: /continuar con mis datos/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /continuar con mis datos/i })).toBeNull();
  });

  it('renders cart items from localStorage with unit price, quantity, subtotal and total', () => {
    seedCart([
      {
        id: 'p1',
        name: 'Milanesa',
        price: 1000,
        image: '/img/milanesa.jpg',
        source: 'offers',
        quantity: 2,
      },
      {
        id: 'p2',
        name: 'Papas',
        price: 500,
        image: '/img/papas.jpg',
        source: 'products',
        quantity: 1,
      },
    ]);

    render(<CartPage />);

    expect(screen.getByText('Milanesa')).toBeTruthy();
    expect(screen.getByText('Papas')).toBeTruthy();
    expect(screen.getByText('Oferta destacada')).toBeTruthy();
    expect(screen.getByText('Menú')).toBeTruthy();
    expect(
      screen.getAllByText((_content, node) => node?.textContent.includes('1.000')).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(
        (_content, node) => node?.id === 'cart-total' && node.textContent.includes('2.500'),
      ),
    ).toBeTruthy();
  });

  it('increments quantity, dispatches cart:updated, persists localStorage and updates the header badge', async () => {
    seedCart([{ id: 'p1', name: 'Milanesa', price: 1000, quantity: 1 }]);
    document.body.innerHTML = '<span id="cart-count">1</span>';
    const cartUpdated = vi.fn();
    document.addEventListener('cart:updated', cartUpdated);

    render(<CartPage />);

    fireEvent.click(screen.getByRole('button', { name: /aumentar cantidad de milanesa/i }));

    await waitFor(() => {
      expect(
        screen.getByText(
          (_content, node) => node?.id === 'cart-total' && node.textContent.includes('2.000'),
        ),
      ).toBeTruthy();
    });

    expect(getStoredCart()).toEqual([
      {
        id: 'p1',
        name: 'Milanesa',
        price: 1000,
        image: '',
        source: 'products',
        quantity: 2,
      },
    ]);
    expect(cartUpdated).toHaveBeenCalledTimes(1);
    expect(document.getElementById('cart-count').textContent).toBe('2');

    document.removeEventListener('cart:updated', cartUpdated);
  });

  it('decrements quantity without allowing values below one', async () => {
    seedCart([{ id: 'p1', name: 'Milanesa', price: 1000, quantity: 2 }]);

    render(<CartPage />);

    const decreaseButton = screen.getByRole('button', { name: /disminuir cantidad de milanesa/i });
    fireEvent.click(decreaseButton);

    await waitFor(() => {
      expect(getStoredCart()[0].quantity).toBe(1);
    });

    expect(decreaseButton.disabled).toBe(true);
    fireEvent.click(decreaseButton);
    expect(getStoredCart()[0].quantity).toBe(1);
  });

  it('removes an item and keeps remaining totals stable', async () => {
    seedCart([
      { id: 'p1', name: 'Milanesa', price: 1000, quantity: 1 },
      { id: 'p2', name: 'Papas', price: 500, quantity: 1 },
    ]);

    render(<CartPage />);

    fireEvent.click(screen.getByRole('button', { name: /eliminar milanesa del carrito/i }));

    await waitFor(() => {
      expect(screen.queryByText('Milanesa')).toBeNull();
    });

    expect(screen.getByText('Papas')).toBeTruthy();
    expect(
      screen.getByText(
        (_content, node) => node?.id === 'cart-total' && node.textContent.includes('500'),
      ),
    ).toBeTruthy();
    expect(getStoredCart()).toEqual([
      {
        id: 'p2',
        name: 'Papas',
        price: 500,
        image: '',
        source: 'products',
        quantity: 1,
      },
    ]);
  });

  it('clears the cart and returns to the empty state safely', async () => {
    seedCart([{ id: 'p1', name: 'Milanesa', price: 1000, quantity: 1 }]);

    render(<CartPage />);

    fireEvent.click(screen.getByRole('button', { name: /vaciar carrito/i }));

    await waitFor(() => {
      expect(screen.getByText('Te falta elegir algo rico.')).toBeTruthy();
    });

    expect(getStoredCart()).toEqual([]);
  });

  it('keeps shopping and confirm CTAs wired to hash navigation when items exist', () => {
    seedCart([{ id: 'p1', name: 'Milanesa', price: 1000, quantity: 1 }]);

    render(<CartPage />);

    expect(screen.getByRole('link', { name: /seguir mirando el menú/i }).getAttribute('href')).toBe(
      '#products',
    );
    expect(
      screen.getByRole('link', { name: /continuar con mis datos/i }).getAttribute('href'),
    ).toBe('#confirm');
  });

  it('blocks confirm with a real disabled button when business is closed', async () => {
    const { loadCommercialContext } = await import('/src/utils/commercialContext.js');
    loadCommercialContext.mockResolvedValueOnce({
      businessOpen: false,
      whatsappNumber: '',
      errorMessage: '',
    });

    seedCart([{ id: 'p1', name: 'Milanesa', price: 1000, quantity: 1 }]);

    render(<CartPage />);

    const confirmButton = await screen.findByRole('button', { name: /continuar con mis datos/i });
    expect(confirmButton.disabled).toBe(true);
    expect(screen.queryByRole('link', { name: /continuar con mis datos/i })).toBeNull();
    expect(screen.getAllByText('El local esta cerrado por ahora.').length).toBeGreaterThan(0);
  });

  it('preserves the payload expected by Confirm after cart updates', async () => {
    seedCart([
      {
        id: 'p1',
        name: 'Milanesa',
        price: 1000,
        image: '/img/milanesa.jpg',
        source: 'offers',
        quantity: 1,
      },
    ]);

    render(<CartPage />);

    fireEvent.click(screen.getByRole('button', { name: /aumentar cantidad de milanesa/i }));

    await waitFor(() => {
      expect(getStoredCart()[0].quantity).toBe(2);
    });

    expect(Object.keys(getStoredCart()[0]).sort()).toEqual([
      'id',
      'image',
      'name',
      'price',
      'quantity',
      'source',
    ]);
    expect(getStoredCart()[0]).toMatchObject({
      id: 'p1',
      name: 'Milanesa',
      price: 1000,
      image: '/img/milanesa.jpg',
      source: 'offers',
      quantity: 2,
    });
  });
});
