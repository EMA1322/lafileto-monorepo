import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.PRISMA_CLIENT_STUB = process.env.PRISMA_CLIENT_STUB || '1';

const { sanitizeSiteConfig } = await import('../../src/settings/siteConfigSanitizers.js');
const { validateAndSanitizeSiteConfig } = await import('../../src/settings/siteConfigValidator.js');
const { settingsService, SITE_CONFIG_KEY } = await import('../../src/services/settingsService.js');
const { settingRepository } = await import('../../src/repositories/settingRepository.js');

test('sanitizeSiteConfig drops invalid social links with javascript scheme', () => {
  const sanitized = sanitizeSiteConfig({
    socialLinks: [
      { label: 'Instagram', url: 'https://instagram.com/lafileto' },
      { label: 'XSS', url: 'javascript:alert(1)' }
    ]
  });

  assert.equal(sanitized.socialLinks.length, 1);
  assert.equal(sanitized.socialLinks[0].url, 'https://instagram.com/lafileto');
});

test('sanitizeSiteConfig normalizes CBU to digits only', () => {
  const sanitized = sanitizeSiteConfig({
    payments: {
      enabled: true,
      cbu: '0000-1234 5678 9012 3456-78'
    }
  });

  assert.equal(sanitized.payments.cbu, '0000123456789012345678');
});

test('sanitizeSiteConfig allowlists google maps embeds only', () => {
  const blocked = sanitizeSiteConfig({
    map: { embedSrc: 'https://evil.example.com/maps/embed?pb=test' }
  });

  const allowed = sanitizeSiteConfig({
    map: { embedSrc: 'https://www.google.com/maps/embed?pb=valid' }
  });

  assert.equal(blocked.map.embedSrc, '');
  assert.equal(allowed.map.embedSrc, 'https://www.google.com/maps/embed?pb=valid');
});

test('validateAndSanitizeSiteConfig reports invalid opening hours without inventing times', () => {
  const result = validateAndSanitizeSiteConfig({
    hours: {
      openingHours: [{ day: 'monday', open: '25:99', close: '22:00' }]
    }
  });

  assert.equal(result.sanitized.hours.openingHours[0].open, '25:99');
  assert.equal(result.errors.some((error) => error.includes('HH:MM')), true);
});

test('getPublicSettings keeps minimal payments DTO when disabled', async () => {
  const originalRepository = {
    findByKey: settingRepository.findByKey,
    upsertByKey: settingRepository.upsertByKey
  };

  settingRepository.findByKey = async () => ({
    key: SITE_CONFIG_KEY,
    value: {
      payments: {
        enabled: false,
        bankName: 'Banco Test',
        cbu: '0000-1234 5678 9012 3456-78',
        alias: 'MI.ALIAS',
        cuit: '20-12345678-9'
      }
    }
  });

  settingRepository.upsertByKey = async () => {
    throw new Error('No debería crear defaults');
  };

  const response = await settingsService.getPublicSettings();

  assert.deepEqual(response.payments, { enabled: false });

  settingRepository.findByKey = originalRepository.findByKey;
  settingRepository.upsertByKey = originalRepository.upsertByKey;
});
