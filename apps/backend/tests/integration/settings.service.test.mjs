import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.PRISMA_CLIENT_STUB = process.env.PRISMA_CLIENT_STUB || '1';

const { settingsService, SITE_CONFIG_KEY } = await import('../../src/services/settingsService.js');
const { settingRepository } = await import('../../src/repositories/settingRepository.js');

const originalRepository = {
  findByKey: settingRepository.findByKey,
  upsertByKey: settingRepository.upsertByKey
};

test.after(() => {
  settingRepository.findByKey = originalRepository.findByKey;
  settingRepository.upsertByKey = originalRepository.upsertByKey;
});

test('getPublicSettings crea defaults cuando no existe siteConfig', async () => {
  const calls = [];

  settingRepository.findByKey = async (key) => {
    calls.push(['findByKey', key]);
    return null;
  };

  settingRepository.upsertByKey = async (key, value) => {
    calls.push(['upsertByKey', key]);
    return { key, value };
  };

  const response = await settingsService.getPublicSettings();

  assert.equal(calls[0][0], 'findByKey');
  assert.equal(calls[0][1], SITE_CONFIG_KEY);
  assert.equal(calls[1][0], 'upsertByKey');
  assert.deepEqual(response.payments, { enabled: false });
  assert.equal(response.hours.timezone, 'America/Argentina/San_Luis');
});

test('getPublicSettings no expone datos bancarios cuando payments.enabled=false', async () => {
  settingRepository.findByKey = async () => ({
    key: SITE_CONFIG_KEY,
    value: {
      payments: {
        enabled: false,
        bankName: 'Banco Test',
        cbu: '123456789',
        alias: 'MI.ALIAS',
        cuit: '20-12345678-9'
      }
    }
  });
  settingRepository.upsertByKey = async () => {
    throw new Error('No debería crear default cuando ya existe siteConfig');
  };

  const response = await settingsService.getPublicSettings();

  assert.deepEqual(response.payments, { enabled: false });
});

test('getAdminSettings devuelve shape completo', async () => {
  settingRepository.findByKey = async () => ({
    key: SITE_CONFIG_KEY,
    value: {
      identity: { phone: '2660000000' },
      payments: { enabled: true, bankName: 'Banco Admin', cbu: '123', alias: 'ALIAS', cuit: '20' }
    }
  });

  const response = await settingsService.getAdminSettings();

  assert.equal(response.identity.phone, '2660000000');
  assert.equal(response.identity.email, '');
  assert.equal(response.payments.enabled, true);
  assert.equal(response.payments.bankName, 'Banco Admin');
});

