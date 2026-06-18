import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFocusTrap } from 'focus-trap';
import { Header } from '/src/react/components/Header.jsx';
import { mountReactHeader, unmountReactHeader } from '/src/react/headerBootstrap.jsx';
import { addToCart } from '/src/utils/cartService.js';

vi.mock('focus-trap', () => ({
  createFocusTrap: vi.fn(() => ({
    activate: vi.fn(),
    deactivate: vi.fn(),
  })),
}));

vi.mock('/src/api/public.js', () => ({
  fetchBusinessStatus: vi.fn(async () => ({ isOpen: true })),
  fetchPublicSettings: vi.fn(async () => ({
    brand: { logoUrl: '/img/logo.png', faviconUrl: '/img/favicon.svg' },
    identity: { phone: '2664123456' },
    hours: { alert: { enabled: true, message: 'Settings alert' } },
    socialLinks: [
      { label: 'Instagram', url: 'https://instagram.com/lafileto' },
      { label: 'Twitter', url: 'https://x.com/lafileto' },
    ],
    whatsapp: { number: '5492664000000' },
  })),
  fetchCommercialConfig: vi.fn(async () => ({
    contact: { phone: '2664555666' },
    whatsapp: { number: '5492664555666' },
    socialLinks: [
      { label: 'Facebook', url: 'https://facebook.com/lafileto' },
      { label: 'Instagram', url: 'notaurl' },
    ],
  })),
}));

function renderHeader() {
  return render(React.createElement(Header));
}

describe('global header', () => {
  it('renders the React header once in the banner host', async () => {
    document.body.innerHTML = '<header role="banner" aria-label="Encabezado principal"></header>';

    mountReactHeader();
    mountReactHeader();

    await waitFor(() => {
      expect(document.querySelectorAll('.header')).toHaveLength(1);
      expect(document.querySelector("body > header[role='banner'] .header")).toBeTruthy();
    });

    unmountReactHeader();
  });

  it('renders public navigation without Confirm and keeps dynamic contact/status data', async () => {
    renderHeader();

    expect(document.querySelector("a[href='#home']")).toBeTruthy();
    expect(document.querySelector("a[href='#products']")).toBeTruthy();
    expect(document.querySelector("a[href='#contact']")).toBeTruthy();
    expect(document.querySelector("a[href='#cart']")).toBeTruthy();
    expect(document.querySelector("a[href='#confirm']")).toBeNull();

    await waitFor(() => {
      expect(document.getElementById('business-status').textContent).toContain('Abierto ahora');
      expect(document.querySelector('[data-header-phone-text]').textContent).toBe('2664123456');
      expect(document.querySelector('[data-header-whatsapp-link]').href).toContain(
        'https://wa.me/5492664000000',
      );
      expect(document.querySelector('[data-header-socials]').textContent).toContain('FB');
      expect(document.querySelector('[data-header-socials]').textContent).toContain('IG');
      expect(document.querySelector('[data-header-socials]').textContent).toContain('TW');
      expect(screen.getByRole('alert').textContent).toContain('Settings alert');
      expect(document.querySelector("link[rel='icon']").getAttribute('href')).toBe(
        '/img/favicon.svg',
      );
    });
  });

  it('uses the dynamic logo in the desktop brand and mobile drawer', async () => {
    renderHeader();

    await waitFor(() => {
      expect(document.querySelectorAll("img[src='/img/logo.png']")).toHaveLength(2);
    });
  });

  it('keeps cart badge synced from initial cart, cartService events, and storage', async () => {
    localStorage.setItem(
      'cart',
      JSON.stringify([{ id: '9', name: 'Napolitana', price: 1200, quantity: 2 }]),
    );

    renderHeader();

    expect(document.getElementById('cart-count').textContent).toBe('2');

    addToCart({ id: '10', name: 'Milanesa', price: 1000, quantity: 1 });

    await waitFor(() => {
      expect(document.getElementById('cart-count').textContent).toBe('3');
    });

    localStorage.setItem(
      'cart',
      JSON.stringify([{ id: '11', name: 'Papas', price: 500, quantity: 4 }]),
    );
    window.dispatchEvent(new StorageEvent('storage', { key: 'cart' }));

    await waitFor(() => {
      expect(document.getElementById('cart-count').textContent).toBe('4');
    });
  });

  it('opens and closes the mobile drawer accessibly', () => {
    renderHeader();

    const toggle = document.getElementById('menu-toggle');
    const menu = document.getElementById('nav-menu');

    fireEvent.click(toggle);

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(menu.getAttribute('aria-hidden')).toBe('false');
    expect(document.body.classList.contains('body-locked')).toBe(true);
    expect(createFocusTrap).toHaveBeenCalled();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(menu.getAttribute('aria-hidden')).toBe('true');
    expect(document.body.classList.contains('body-locked')).toBe(false);
    expect(document.activeElement).toBe(toggle);
  });

  it('closes the mobile drawer with overlay and internal links', () => {
    renderHeader();

    const toggle = document.getElementById('menu-toggle');
    const menu = document.getElementById('nav-menu');

    fireEvent.click(toggle);
    fireEvent.click(document.getElementById('header-overlay'));

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(menu.getAttribute('aria-hidden')).toBe('true');

    fireEvent.click(toggle);
    fireEvent.click(screen.getAllByRole('link', { name: 'Productos' })[1]);

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(menu.getAttribute('aria-hidden')).toBe('true');
    expect(document.body.classList.contains('body-locked')).toBe(false);

    fireEvent.click(toggle);
    const drawerContactLink = screen.getAllByRole('link', { name: 'Contacto' })[1];
    expect(drawerContactLink.getAttribute('href')).toBe('#contact');
    fireEvent.click(drawerContactLink);

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(menu.getAttribute('aria-hidden')).toBe('true');
  });
});
