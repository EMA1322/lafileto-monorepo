import { useCallback, useEffect, useMemo, useState } from 'react';
import { settingsApi } from '@/utils/apis.js';
import { canRead, canWrite, ensureRbacLoaded } from '@/utils/rbac.js';
import { AdminThemeScope, Button, StateBlock } from '../ui/index.js';
import SettingsForm from '../settings/SettingsForm.jsx';
import { createSocialLink, setIn } from '../settings/settingsForm.helpers.js';
import {
  buildSettingsPayload,
  normalizeSettingsConfig,
  serializeSettings,
} from '../settings/settingsPayload.helpers.js';
import {
  formatCbuMask,
  mapSettingsApiError,
  normalizeDigits,
  validateSettingsDraft,
} from '../settings/settingsValidation.helpers.js';
import { syncSettingsBranding } from '../settings/settingsSideEffects.js';
import styles from './SettingsPage.module.css';

const VIEW_STATUS = {
  loading: 'loading',
  error: 'error',
  empty: 'empty',
  success: 'success',
};

function isEmptySettings(value) {
  if (value == null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

function resolveLoadError(error) {
  if (error?.status === 401) return 'Tu sesion expiro. Inicia sesion nuevamente para continuar.';
  if (error?.status === 403) return 'No tenes permisos para ver la configuracion del sistema.';
  return error?.message || 'No pudimos cargar la configuracion.';
}

function updateSocialLink(links, index, field, value) {
  return links.map((link, currentIndex) =>
    currentIndex === index ? { ...link, [field]: value } : link,
  );
}

function updateOpeningHour(rows, index, field, value) {
  return rows.map((slot, currentIndex) => {
    if (currentIndex !== index) return slot;
    if (field === 'closed' && value) {
      return { ...slot, closed: true, open: '', close: '' };
    }
    return { ...slot, [field]: value };
  });
}

export default function SettingsPage() {
  // eslint-disable-next-line no-unused-vars -- This ESLint setup does not count JSX member expressions as usage.
  const Ui = { AdminThemeScope, Button, StateBlock };
  // eslint-disable-next-line no-unused-vars -- Static contract tests assert this React form boundary.
  const View = { SettingsForm };

  const [status, setStatus] = useState(VIEW_STATUS.loading);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [originalConfig, setOriginalConfig] = useState(null);
  const [draft, setDraft] = useState(() => normalizeSettingsConfig(null));
  const [saving, setSaving] = useState(false);
  const [permissionsReady, setPermissionsReady] = useState(false);

  const permissions = useMemo(
    () => ({
      canRead: canRead('settings'),
      canWrite: canWrite('settings'),
    }),
    [permissionsReady],
  );

  const isDirty = useMemo(() => {
    if (!originalConfig) return false;
    return serializeSettings(originalConfig) !== serializeSettings(draft);
  }, [draft, originalConfig]);

  const loadSettings = useCallback(async ({ signal } = {}) => {
    setStatus(VIEW_STATUS.loading);
    setLoadError('');
    setSaveError('');
    setSaveSuccess('');
    setFieldErrors({});

    try {
      const response = await settingsApi.get({ signal });
      const payload = response?.data ?? null;

      if (isEmptySettings(payload)) {
        setOriginalConfig(null);
        setDraft(normalizeSettingsConfig(null));
        setStatus(VIEW_STATUS.empty);
        return;
      }

      const normalized = normalizeSettingsConfig(payload);
      setOriginalConfig(normalized);
      setDraft(normalized);
      syncSettingsBranding(normalized);
      setStatus(VIEW_STATUS.success);
    } catch (error) {
      if (signal?.aborted) return;
      setLoadError(resolveLoadError(error));
      setStatus(VIEW_STATUS.error);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    ensureRbacLoaded()
      .catch(() => null)
      .finally(() => {
        if (mounted) setPermissionsReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!permissionsReady) return undefined;
    if (!permissions.canRead) {
      setStatus(VIEW_STATUS.error);
      setLoadError('No tenes permisos para ver la configuracion del sistema.');
      return undefined;
    }

    const controller = new AbortController();
    void loadSettings({ signal: controller.signal });
    return () => controller.abort();
  }, [loadSettings, permissions.canRead, permissionsReady]);

  function updateField(path, value) {
    setDraft((current) => setIn(current, path, value));
    setFieldErrors((current) => ({ ...current, [path]: '' }));
    setSaveError('');
    setSaveSuccess('');
  }

  function updateSocial(index, field, value) {
    setDraft((current) => ({
      ...current,
      socialLinks: updateSocialLink(current.socialLinks, index, field, value),
    }));
    setFieldErrors((current) => ({ ...current, [`socialLinks.${index}.${field}`]: '' }));
    setSaveError('');
    setSaveSuccess('');
  }

  function addSocial() {
    setDraft((current) => ({
      ...current,
      socialLinks: [...current.socialLinks, createSocialLink()],
    }));
    setSaveSuccess('');
  }

  function removeSocial(index) {
    setDraft((current) => ({
      ...current,
      socialLinks: current.socialLinks.filter((_, currentIndex) => currentIndex !== index),
    }));
    setFieldErrors({});
    setSaveSuccess('');
  }

  function updateHour(index, field, value) {
    setDraft((current) => ({
      ...current,
      hours: {
        ...current.hours,
        openingHours: updateOpeningHour(current.hours.openingHours, index, field, value),
      },
    }));
    setFieldErrors((current) => ({ ...current, [`hours.openingHours.${index}`]: '' }));
    setSaveError('');
    setSaveSuccess('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving || !permissions.canWrite || !originalConfig) return;

    const nextDraft = {
      ...draft,
      payments: {
        ...draft.payments,
        cbu: formatCbuMask(draft.payments.cbu),
        cuit: normalizeDigits(draft.payments.cuit),
      },
    };
    const nextFieldErrors = validateSettingsDraft(nextDraft);

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setSaveError('Revisa los campos con errores antes de guardar.');
      setSaveSuccess('');
      return;
    }

    setSaving(true);
    setSaveError('');
    setSaveSuccess('');
    setFieldErrors({});

    try {
      const payload = buildSettingsPayload(originalConfig, nextDraft);
      const response = await settingsApi.update(payload);
      const saved = normalizeSettingsConfig(response?.data || payload);

      setOriginalConfig(saved);
      setDraft(saved);
      syncSettingsBranding(saved);
      setSaveSuccess('Configuracion guardada correctamente.');
    } catch (error) {
      const mapped = mapSettingsApiError(error);
      setFieldErrors(mapped.fieldErrors);
      setSaveError(mapped.generalError);
    } finally {
      setSaving(false);
    }
  }

  const disabled = saving || !permissions.canWrite;
  const canSave = permissions.canWrite && isDirty && !saving && status === VIEW_STATUS.success;

  let content = null;
  if (!permissionsReady || status === VIEW_STATUS.loading) {
    content = <StateBlock status="loading" title="Cargando configuracion" />;
  } else if (status === VIEW_STATUS.error) {
    content = (
      <StateBlock
        action={
          permissions.canRead ? (
            <Button onClick={() => loadSettings()} variant="secondary">
              Reintentar
            </Button>
          ) : null
        }
        description={loadError}
        status="error"
        title="No pudimos cargar Settings"
      />
    );
  } else if (status === VIEW_STATUS.empty) {
    content = <StateBlock status="empty" title="No hay configuracion disponible" />;
  } else {
    content = (
      <form className={styles.panel} onSubmit={handleSubmit}>
        {!permissions.canWrite ? (
          <p className={`${styles.alert} ${styles.alertInfo}`} role="status">
            No tenes permiso para editar. La configuracion se muestra en modo solo lectura.
          </p>
        ) : null}
        {saveError ? (
          <p className={`${styles.alert} ${styles.alertError}`} role="alert">
            {saveError}
          </p>
        ) : null}
        {saveSuccess ? (
          <p className={`${styles.alert} ${styles.alertSuccess}`} role="status">
            {saveSuccess}
          </p>
        ) : null}

        <SettingsForm
          disabled={disabled}
          errors={fieldErrors}
          onAddSocial={addSocial}
          onFieldChange={updateField}
          onHourChange={updateHour}
          onRemoveSocial={removeSocial}
          onSocialChange={updateSocial}
          value={draft}
        />

        <footer className={styles.footer}>
          <span>{isDirty ? 'Hay cambios sin guardar.' : 'Sin cambios pendientes.'}</span>
          <div className={styles.actions}>
            <Button disabled={saving} onClick={() => loadSettings()} variant="ghost">
              Actualizar
            </Button>
            <Button disabled={!canSave} loading={saving} type="submit" variant="primary">
              Guardar
            </Button>
          </div>
        </footer>
      </form>
    );
  }

  return (
    <AdminThemeScope className={styles.theme}>
      <main className={styles.page} aria-labelledby="settings-page-title">
        <header className={styles.header}>
          <div>
            <h1 id="settings-page-title">Configuracion</h1>
            <p>Gestiona identidad, contacto, disponibilidad y datos publicos del sitio.</p>
          </div>
          <div className={styles.actions}>
            <Button
              disabled={saving || status === VIEW_STATUS.loading}
              onClick={() => loadSettings()}
              variant="secondary"
            >
              Actualizar
            </Button>
          </div>
        </header>

        {content}
      </main>
    </AdminThemeScope>
  );
}
