import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ContactPage } from '/src/react/pages/ContactPage.jsx';
import { AppRouter } from '/src/react/router/AppRouter.jsx';

vi.mock('/src/api/public.js', () => ({
  fetchBusinessStatus: vi.fn(async () => ({ isOpen: true })),
  fetchPublicSettings: vi.fn(async () => ({
    identity: {
      address: 'Settings address 123',
      email: 'settings@lafileto.test',
      phone: '+54 266 400-0000',
    },
    map: { embedSrc: 'https://www.google.com/maps/embed?pb=settings-map' },
    payments: {
      transferEnabled: true,
      bankName: 'Banco Publico',
      cbu: '0000123456789012345678',
      alias: 'LA.FILETO',
      cuit: '20123456789',
    },
    hours: {
      openingHours: [
        { day: 'monday', open: '09:00', close: '13:00', closed: false },
        { day: 'sunday', open: '', close: '', closed: true },
      ],
    },
    seo: {
      contact: {
        title: 'Contacto La Fileto',
        description: 'Canales directos de La Fileto.',
      },
    },
    whatsapp: { number: '+54 9 266 400-0000', messageCta: 'Escribinos por WhatsApp.' },
  })),
  fetchCommercialConfig: vi.fn(async () => ({
    contact: {
      address: 'Commercial address',
      email: 'commercial@lafileto.test',
      phone: '2664555666',
    },
    whatsapp: { number: '+54 9 266 455-5666', message: 'Commercial CTA' },
  })),
}));

function renderContactPage() {
  return render(<ContactPage />);
}

describe('ContactPage integration', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    document.head.innerHTML = '';
    document.title = '';
    window.location.hash = '';

    const api = await import('/src/api/public.js');
    api.fetchBusinessStatus.mockResolvedValue({ isOpen: true });
    api.fetchPublicSettings.mockResolvedValue({
      identity: {
        address: 'Settings address 123',
        email: 'settings@lafileto.test',
        phone: '+54 266 400-0000',
      },
      map: { embedSrc: 'https://www.google.com/maps/embed?pb=settings-map' },
      payments: {
        transferEnabled: true,
        bankName: 'Banco Publico',
        cbu: '0000123456789012345678',
        alias: 'LA.FILETO',
        cuit: '20123456789',
      },
      hours: {
        openingHours: [
          { day: 'monday', open: '09:00', close: '13:00', closed: false },
          { day: 'sunday', open: '', close: '', closed: true },
        ],
      },
      seo: {
        contact: {
          title: 'Contacto La Fileto',
          description: 'Canales directos de La Fileto.',
        },
      },
      whatsapp: { number: '+54 9 266 400-0000', messageCta: 'Escribinos por WhatsApp.' },
    });
    api.fetchCommercialConfig.mockResolvedValue({
      contact: {
        address: 'Commercial address',
        email: 'commercial@lafileto.test',
        phone: '2664555666',
      },
      whatsapp: { number: '+54 9 266 455-5666', message: 'Commercial CTA' },
    });
  });

  it('renders contact data from normalized public settings', async () => {
    renderContactPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Contacto La Fileto' }),
    ).toBeTruthy();

    await waitFor(() => {
      expect(document.body.textContent).toContain('+54 266 400-0000');
      expect(document.body.textContent).toContain('settings@lafileto.test');
      expect(document.body.textContent).toContain('Settings address 123');
      expect(document.body.textContent).not.toContain('Commercial address');
      expect(document.querySelector("a[href='tel:542664000000']")).toBeTruthy();
      expect(document.querySelector("a[href='mailto:settings@lafileto.test']")).toBeTruthy();
    });
  });

  it('renders a WhatsApp CTA with messageCta and does not affect order confirmation', async () => {
    renderContactPage();

    await waitFor(() => {
      const cta = document.querySelector('[data-contact-whatsapp-cta]');
      const link = screen.getByRole('link', { name: 'Escribir por WhatsApp' });

      expect(cta.textContent).toContain('Escribinos por WhatsApp.');
      expect(link.getAttribute('href')).toContain('https://wa.me/5492664000000?text=');
      expect(decodeURIComponent(link.getAttribute('href'))).toContain('Escribinos por WhatsApp.');
      expect(screen.queryByRole('button', { name: /send via whatsapp/i })).toBeNull();
    });
  });

  it('renders a Google Maps iframe only when embedSrc is valid', async () => {
    renderContactPage();

    await waitFor(() => {
      const iframe = document.querySelector('[data-contact-map]');
      expect(iframe).toBeTruthy();
      expect(iframe.getAttribute('src')).toBe('https://www.google.com/maps/embed?pb=settings-map');
      expect(iframe.getAttribute('title')).toBe('Mapa de ubicacion de La Fileto');
    });
  });

  it('renders transfer payments only when transferEnabled is true', async () => {
    renderContactPage();

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 2, name: 'Pagos por transferencia' }),
      ).toBeTruthy();
      expect(document.body.textContent).toContain('Banco Publico');
      expect(document.body.textContent).toContain('0000123456789012345678');
      expect(document.body.textContent).toContain('LA.FILETO');
      expect(document.body.textContent).toContain('20123456789');
    });
  });

  it('does not render bank data when transfer payments are disabled', async () => {
    const api = await import('/src/api/public.js');
    api.fetchPublicSettings.mockResolvedValueOnce({
      identity: {
        address: 'Settings address 123',
        email: 'settings@lafileto.test',
        phone: '+54 266 400-0000',
      },
      payments: {
        transferEnabled: false,
        bankName: 'Banco Oculto',
        cbu: '0000123456789012345678',
        alias: 'OCULTO',
        cuit: '20123456789',
      },
      hours: { openingHours: [] },
      map: { embedSrc: '' },
      seo: { contact: {} },
      whatsapp: {},
    });

    renderContactPage();

    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { level: 2, name: 'Pagos por transferencia' }),
      ).toBeNull();
      expect(document.body.textContent).not.toContain('Banco Oculto');
      expect(document.body.textContent).not.toContain('0000123456789012345678');
      expect(document.body.textContent).not.toContain('OCULTO');
    });
  });

  it('renders opening hours and closed days from public settings', async () => {
    renderContactPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: 'Horarios' })).toBeTruthy();
      expect(document.body.textContent).toContain('Abierto ahora');
      expect(document.body.textContent).toContain('Lunes');
      expect(document.body.textContent).toContain('09:00 a 13:00');
      expect(document.body.textContent).toContain('Domingo');
      expect(document.body.textContent).toContain('Cerrado');
    });
  });

  it('falls back cleanly when contact data and map are missing', async () => {
    const api = await import('/src/api/public.js');
    api.fetchPublicSettings.mockResolvedValueOnce({
      identity: {},
      map: { embedSrc: '' },
      hours: {},
      payments: { transferEnabled: false },
      seo: { contact: {} },
      whatsapp: {},
    });
    api.fetchCommercialConfig.mockResolvedValueOnce({ contact: {}, whatsapp: {} });

    renderContactPage();

    expect(await screen.findByRole('heading', { level: 1, name: 'Contacto' })).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText('Contacto en preparacion')).toBeTruthy();
      expect(screen.getByText('Mapa no disponible por ahora.')).toBeTruthy();
      expect(screen.getByText('Horarios no disponibles por ahora.')).toBeTruthy();
      expect(document.querySelector('[data-contact-map]')).toBeNull();
      expect(screen.queryByRole('link', { name: 'Escribir por WhatsApp' })).toBeNull();
    });
  });

  it('applies contact SEO metadata when settings provides it', async () => {
    renderContactPage();

    await waitFor(() => {
      expect(document.title).toBe('Contacto La Fileto');
      expect(document.querySelector("meta[name='description']").getAttribute('content')).toBe(
        'Canales directos de La Fileto.',
      );
    });
  });

  it('routes #contact and #contacto to ContactPage without implementing Nosotros', async () => {
    window.location.hash = '#contact';
    const { unmount } = render(<AppRouter />);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Contacto La Fileto' }),
    ).toBeTruthy();
    expect(screen.queryByRole('heading', { level: 1, name: /Nosotros/i })).toBeNull();

    unmount();
    window.location.hash = '#contacto';
    render(<AppRouter />);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Contacto La Fileto' }),
    ).toBeTruthy();
  });
});
