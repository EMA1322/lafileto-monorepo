import { describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { createFocusTrap } from 'focus-trap';
import { initHeader } from '/src/components/header/header.js';
import { addToCart } from '/src/utils/cartService.js';
import headerHtml from '/src/components/header/header.html?raw';

vi.mock('focus-trap', () => ({
  createFocusTrap: vi.fn(() => ({
    activate: vi.fn(),
    deactivate: vi.fn(),
  })),
}));

vi.mock('/src/api/public.js', () => ({
  fetchBusinessStatus: vi.fn(async () => ({ isOpen: true })),
  fetchPublicSettings: vi.fn(async () => ({
    identity: { phone: '2664123456' },
    socialLinks: [{ label: 'Instagram', url: 'https://instagram.com/lafileto' }],
  })),
  fetchCommercialConfig: vi.fn(async () => ({
    contact: { phone: '2664555666' },
    whatsapp: { number: '5492664555666' },
    socialLinks: [{ label: 'Facebook', url: 'https://facebook.com/lafileto' }],
  })),
}));

function mountHeader() {
  document.body.innerHTML = headerHtml;
  initHeader();
}

describe('global header', () => {
  it('renders public navigation without Confirm and keeps dynamic contact/status data', async () => {
    mountHeader();

    expect(document.querySelector("a[href='#home']")).toBeTruthy();
    expect(document.querySelector("a[href='#products']")).toBeTruthy();
    expect(document.querySelector("a[href='#contact']")).toBeTruthy();
    expect(document.querySelector("a[href='#confirm']")).toBeNull();

    await waitFor(() => {
      expect(document.getElementById('business-status').textContent).toContain('Abierto ahora');
      expect(document.querySelector('[data-header-phone-text]').textContent).toBe('2664555666');
      expect(document.querySelector('[data-header-whatsapp-link]').href).toContain(
        'https://wa.me/5492664555666',
      );
      expect(document.querySelector('[data-header-socials]').textContent).toContain('FB');
      expect(document.querySelector('[data-header-socials]').textContent).toContain('IG');
    });
  });

  it('keeps cart badge synced through cartService and cart:updated', () => {
    mountHeader();

    addToCart({ id: '10', name: 'Milanesa', price: 1000, quantity: 1 });

    expect(document.getElementById('cart-count').textContent).toBe('1');
  });

  it('opens and closes the mobile drawer accessibly', () => {
    mountHeader();

    const toggle = document.getElementById('menu-toggle');
    const menu = document.getElementById('nav-menu');

    toggle.click();

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(menu.getAttribute('aria-hidden')).toBe('false');
    expect(document.body.classList.contains('body-locked')).toBe(true);
    expect(createFocusTrap).toHaveBeenCalled();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(menu.getAttribute('aria-hidden')).toBe('true');
    expect(document.body.classList.contains('body-locked')).toBe(false);
    expect(document.activeElement).toBe(toggle);
  });
});
