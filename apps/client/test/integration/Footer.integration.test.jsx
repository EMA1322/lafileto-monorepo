import { describe, expect, it, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Footer } from '/src/react/components/Footer.jsx';
import { mountReactFooter, unmountReactFooter } from '/src/react/footerBootstrap.jsx';

vi.mock('/src/api/public.js', () => ({
  fetchBusinessStatus: vi.fn(async () => ({ isOpen: true })),
  fetchPublicSettings: vi.fn(async () => ({
    brand: { logo: '/img/logo.png' },
    identity: {
      address: 'Settings address',
      email: 'settings@lafileto.test',
      phone: '2664000000',
    },
    map: { embedSrc: 'https://maps.example.com/lafileto' },
    socialLinks: [
      { label: 'Instagram', url: 'https://instagram.com/lafileto' },
      { label: 'Facebook', url: 'notaurl' },
      { label: 'Twitter', url: 'https://x.com/lafileto' },
    ],
    whatsapp: { number: '5492664000000' },
  })),
  fetchCommercialConfig: vi.fn(async () => ({
    contact: {
      address: 'Commercial address',
      email: 'pedidos@lafileto.test',
      phone: '2664555666',
    },
    socialLinks: [
      { label: 'Facebook', url: 'https://facebook.com/lafileto' },
      { label: 'Instagram', url: 'bad-url' },
    ],
    whatsapp: { number: '+54 9 266 455-5666' },
  })),
}));

function renderFooter() {
  return render(React.createElement(Footer));
}

describe('global footer', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    document.body.innerHTML = '';

    const api = await import('/src/api/public.js');
    api.fetchBusinessStatus.mockResolvedValue({ isOpen: true });
    api.fetchPublicSettings.mockResolvedValue({
      brand: { logo: '/img/logo.png' },
      identity: {
        address: 'Settings address',
        email: 'settings@lafileto.test',
        phone: '2664000000',
      },
      map: { embedSrc: 'https://maps.example.com/lafileto' },
      socialLinks: [
        { label: 'Instagram', url: 'https://instagram.com/lafileto' },
        { label: 'Facebook', url: 'notaurl' },
        { label: 'Twitter', url: 'https://x.com/lafileto' },
      ],
      whatsapp: { number: '5492664000000' },
    });
    api.fetchCommercialConfig.mockResolvedValue({
      contact: {
        address: 'Commercial address',
        email: 'pedidos@lafileto.test',
        phone: '2664555666',
      },
      socialLinks: [
        { label: 'Facebook', url: 'https://facebook.com/lafileto' },
        { label: 'Instagram', url: 'bad-url' },
      ],
      whatsapp: { number: '+54 9 266 455-5666' },
    });
  });

  it('mounts the React footer once inside the existing contentinfo host', async () => {
    document.body.innerHTML =
      '<footer id="contact" role="contentinfo" aria-label="Pie de pagina"></footer>';

    mountReactFooter();
    mountReactFooter();

    await waitFor(() => {
      expect(document.querySelectorAll('[data-react-footer-root]')).toHaveLength(1);
      expect(document.querySelectorAll('[role="contentinfo"]')).toHaveLength(1);
      expect(
        document.querySelector("body > footer#contact[role='contentinfo'] .footer"),
      ).toBeTruthy();
    });

    unmountReactFooter();
  });

  it('renders branding, delivery zone and public navigation without Confirm', async () => {
    renderFooter();

    expect(screen.getByText('La Fileto')).toBeTruthy();
    expect(screen.getByText('Sabores auténticos a domicilio')).toBeTruthy();
    expect(screen.getAllByText('Zona de reparto: Quines – San Luis').length).toBeGreaterThan(0);
    expect(document.querySelector("a[href='#home']")).toBeTruthy();
    expect(document.querySelector("a[href='#products']")).toBeTruthy();
    expect(document.querySelector("a[href='#contact']")).toBeTruthy();
    expect(document.querySelector("a[href='#cart']")).toBeTruthy();
    expect(document.querySelector("a[href='#confirm']")).toBeNull();
    expect(document.body.textContent).toContain(String(new Date().getFullYear()));
  });

  it('prioritizes commercial config contact data and builds safe contact links', async () => {
    renderFooter();

    await waitFor(() => {
      expect(document.querySelector('[data-footer-phone-link]').getAttribute('href')).toBe(
        'tel:2664555666',
      );
      expect(document.querySelector("a[href='mailto:pedidos@lafileto.test']")).toBeTruthy();
      expect(document.querySelector("a[href='https://wa.me/5492664555666']")).toBeTruthy();
      expect(document.body.textContent).toContain('Commercial address');
      expect(document.body.textContent).not.toContain('Settings address');
    });
  });

  it('renders valid Instagram and Facebook social links once with secure external attributes', async () => {
    renderFooter();

    await waitFor(() => {
      const instagram = screen.getByLabelText('Instagram de La Fileto');
      const facebook = screen.getByLabelText('Facebook de La Fileto');

      expect(instagram.getAttribute('href')).toBe('https://instagram.com/lafileto');
      expect(facebook.getAttribute('href')).toBe('https://facebook.com/lafileto');
      expect(instagram.getAttribute('target')).toBe('_blank');
      expect(instagram.getAttribute('rel')).toBe('noopener noreferrer');
      expect(facebook.getAttribute('target')).toBe('_blank');
      expect(facebook.getAttribute('rel')).toBe('noopener noreferrer');
      expect(screen.queryByLabelText('Twitter de La Fileto')).toBeNull();
      expect(screen.getAllByLabelText('Instagram de La Fileto')).toHaveLength(1);
      expect(screen.getAllByLabelText('Facebook de La Fileto')).toHaveLength(1);
    });
  });

  it('uses a dynamic logo when settings exposes a valid logo URL', async () => {
    renderFooter();

    await waitFor(() => {
      const logo = screen.getByAltText('La Fileto - Menú digital');
      expect(logo.getAttribute('src')).toBe('/img/logo.png');
    });
  });

  it('hides dynamic contact and social blocks without valid data', async () => {
    const api = await import('/src/api/public.js');
    api.fetchPublicSettings.mockResolvedValueOnce({
      brand: { logo: '' },
      identity: {},
      map: { embedSrc: 'javascript:alert(1)' },
      socialLinks: [{ label: 'Instagram', url: 'bad-url' }],
      whatsapp: {},
    });
    api.fetchCommercialConfig.mockResolvedValueOnce({
      contact: {},
      socialLinks: [{ label: 'Facebook', url: 'not-a-url' }],
      whatsapp: {},
    });
    api.fetchBusinessStatus.mockRejectedValueOnce(new Error('status unavailable'));

    renderFooter();

    await waitFor(() => {
      expect(document.querySelector('[data-footer-phone-link]')).toBeNull();
      expect(document.querySelector("a[href^='mailto:']")).toBeNull();
      expect(document.querySelector("a[href^='https://wa.me/']")).toBeNull();
      expect(screen.queryByLabelText('Instagram de La Fileto')).toBeNull();
      expect(screen.queryByLabelText('Facebook de La Fileto')).toBeNull();
      expect(screen.getByText('Contacto disponible al confirmar el pedido.')).toBeTruthy();
      expect(screen.queryByText('Abierto ahora')).toBeNull();
    });
  });

  it('does not render empty anchors', async () => {
    renderFooter();

    await waitFor(() => {
      const anchors = [...document.querySelectorAll('a')];
      expect(anchors.length).toBeGreaterThan(0);
      expect(anchors.every((anchor) => Boolean(anchor.getAttribute('href')))).toBe(true);
    });
  });
});
