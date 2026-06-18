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
        socialLinks: [
          { label: 'Instagram', url: 'https://instagram.com/lafileto' },
          { label: 'Facebook', url: 'notaurl' },
        ],
        map: { embedSrc: 'https://www.google.com/maps/embed?pb=settings-map' },
        payments: {
          transferEnabled: true,
          bankName: 'Banco Publico',
          cbu: '0000123456789012345678',
          alias: 'LA.FILETO',
          cuit: '20123456789',
        },
        hours: {
          timezone: 'America/Argentina/Buenos_Aires',
          openingHours: [
            { day: 'monday', open: '09:00', close: '13:00', closed: false },
            { day: 'sunday', open: '', close: '', closed: true },
          ],
          alert: { enabled: true, message: 'Settings alert' },
        },
        seo: { contact: { title: 'Contacto La Fileto', description: 'Escribinos.' } },
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
    expect(context.map.embedSrc).toBe('https://www.google.com/maps/embed?pb=settings-map');
    expect(context.seo.contactTitle).toBe('Contacto La Fileto');
    expect(context.seo.contactDescription).toBe('Escribinos.');
    expect(context.alert).toEqual({ enabled: true, message: 'Status alert' });
    expect(context.payments).toEqual({
      transferEnabled: true,
      bankName: 'Banco Publico',
      cbu: '0000123456789012345678',
      alias: 'LA.FILETO',
      cuit: '20123456789',
    });
    expect(context.hours.timezone).toBe('America/Argentina/Buenos_Aires');
    expect(context.hours.openingHours).toEqual([
      { day: 'monday', open: '09:00', close: '13:00', closed: false },
      { day: 'sunday', open: '', close: '', closed: true },
    ]);
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
    expect(context.map.embedSrc).toBe('');
    expect(context.socialLinks).toEqual([]);
  });

  it('keeps only Google Maps embed URLs for the iframe contract', () => {
    const blocked = normalizePublicClientSettings({
      settings: {
        map: { embedSrc: 'https://evil.example.com/maps/embed?pb=test' },
      },
    });
    const allowed = normalizePublicClientSettings({
      settings: {
        map: { embedSrc: 'https://www.google.com/maps/embed?pb=valid' },
      },
    });

    expect(blocked.map.embedSrc).toBe('');
    expect(blocked.contact.mapHref).toBe('https://evil.example.com/maps/embed?pb=test');
    expect(allowed.map.embedSrc).toBe('https://www.google.com/maps/embed?pb=valid');
  });

  it('keeps disabled payments minimal and tolerates incomplete hours payloads', () => {
    const context = normalizePublicClientSettings({
      settings: {
        payments: {
          transferEnabled: false,
          bankName: 'Banco Oculto',
          cbu: '0000123456789012345678',
          alias: 'OCULTO',
          cuit: '20123456789',
        },
        hours: {
          openingHours: [{ day: 'friday', open: '20:00' }, null],
        },
      },
    });

    expect(context.payments).toEqual({ transferEnabled: false });
    expect(context.hours.openingHours).toEqual([
      { day: 'friday', open: '20:00', close: '', closed: false },
      { day: '', open: '', close: '', closed: false },
    ]);
  });
});
