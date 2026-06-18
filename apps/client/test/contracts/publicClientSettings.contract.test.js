import { describe, expect, it } from 'vitest';
import { normalizePublicClientSettings } from '/src/react/settings/publicClientSettings.js';

describe('public client settings normalizer', () => {
  it('uses public settings as the primary source and commercial config as fallback', () => {
    const context = normalizePublicClientSettings({
      settings: {
        brand: { logoUrl: '/img/logo.png', faviconUrl: '/img/favicon.svg' },
        identity: {
          address: 'Settings address',
          email: 'settings@lafileto.test',
          phone: '+54 266 400-0000',
        },
        hours: { alert: { enabled: true, message: 'Settings alert' } },
        socialLinks: [
          { label: 'Instagram', url: 'https://instagram.com/lafileto' },
          { label: 'Facebook', url: 'notaurl' },
        ],
        whatsapp: { number: '+54 9 266 400-0000', message: 'Settings CTA' },
      },
      businessStatus: {
        isOpen: true,
        alert: { enabled: true, message: 'Status alert' },
      },
      commercialConfig: {
        contact: {
          address: 'Commercial address',
          email: 'commercial@lafileto.test',
          phone: '2664555666',
        },
        socialLinks: [
          { label: 'Facebook', url: 'https://facebook.com/lafileto' },
          { label: 'Instagram', url: 'https://instagram.com/duplicate' },
        ],
        whatsapp: { number: '+54 9 266 455-5666', message: 'Commercial CTA' },
      },
    });

    expect(context.brand.logoUrl).toBe('/img/logo.png');
    expect(context.brand.faviconUrl).toBe('/img/favicon.svg');
    expect(context.contact.phone).toBe('+54 266 400-0000');
    expect(context.contact.email).toBe('settings@lafileto.test');
    expect(context.contact.address).toBe('Settings address');
    expect(context.whatsapp.numberDigits).toBe('5492664000000');
    expect(context.whatsapp.messageCta).toBe('Settings CTA');
    expect(context.alert).toEqual({ enabled: true, message: 'Status alert' });
    expect(context.socialLinks.map((link) => link.label)).toEqual(['Instagram', 'Facebook']);
  });

  it('falls back to identity phone only when WhatsApp numbers are missing', () => {
    const context = normalizePublicClientSettings({
      settings: {
        identity: { phone: '+54 9 11 8888-0000' },
        whatsapp: { number: '' },
      },
      commercialConfig: {
        whatsapp: { number: '' },
      },
    });

    expect(context.whatsapp.numberDigits).toBe('5491188880000');
  });

  it('drops unsafe URLs without throwing', () => {
    const context = normalizePublicClientSettings({
      settings: {
        brand: { logoUrl: 'javascript:alert(1)', faviconUrl: 'ftp://bad.test/icon.ico' },
        map: { embedSrc: 'javascript:alert(1)' },
        socialLinks: [{ label: 'Instagram', url: 'javascript:alert(1)' }],
      },
    });

    expect(context.brand.logoUrl).toBe('');
    expect(context.brand.faviconUrl).toBe('');
    expect(context.contact.mapHref).toBe('');
    expect(context.socialLinks).toEqual([]);
  });
});
