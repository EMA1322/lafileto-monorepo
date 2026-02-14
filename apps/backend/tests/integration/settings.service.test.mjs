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

test('updateAdminSettings persiste siteConfig sanitizado con metadata de actualización', async () => {
  const calls = [];

  settingRepository.upsertByKey = async (key, value) => {
    calls.push([key, value]);
    return { key, value };
  };

  const response = await settingsService.updateAdminSettings(
    {
      identity: { phone: '266-123-0000', email: 'admin@lafileto.com' },
      payments: { enabled: true, cbu: '0000-1234 5678 9012 3456-78' }
    },
    'user-123'
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], SITE_CONFIG_KEY);
  assert.equal(calls[0][1].meta.updatedByUserId, 'user-123');
  assert.equal(typeof calls[0][1].meta.updatedAt, 'string');
  assert.equal(calls[0][1].payments.cbu, '0000123456789012345678');
  assert.equal(response.meta, undefined);
});

test('updateAdminSettings falla con 400 cuando hay errores de validación', async () => {
  await assert.rejects(
    () =>
      settingsService.updateAdminSettings({
        socialLinks: [{ label: 'XSS', url: 'javascript:alert(1)' }],
        hours: { override: 'INVALID' }
      }, 'user-1'),
    (error) => {
      assert.equal(error.code, 'BAD_REQUEST');
      assert.equal(error.httpStatus, 400);
      assert.equal(Array.isArray(error.details?.fields), true);
      assert.equal(error.details.fields[0].path.includes('.'), true);
      return true;
    }
  );
});

test('getPublicSettings nunca expone meta', async () => {
  settingRepository.findByKey = async () => ({
    key: SITE_CONFIG_KEY,
    value: {
      payments: { enabled: false },
      meta: {
        updatedByUserId: 'admin-1',
        updatedAt: '2026-01-01T00:00:00.000Z'
      }
    }
  });

  const response = await settingsService.getPublicSettings();

  assert.equal(response.meta, undefined);
});
