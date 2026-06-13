import { TextAreaField } from './BrandingSection.jsx';
import { OVERRIDE_OPTIONS } from './settingsValidation.helpers.js';
import styles from './SettingsForm.module.css';

const OVERRIDE_LABELS = {
  AUTO: 'Automatico',
  FORCE_OPEN: 'Forzar abierto',
  FORCE_CLOSED: 'Forzar cerrado',
};

export default function DeliverySection({ disabled, errors, onFieldChange, value }) {
  // eslint-disable-next-line no-unused-vars -- This ESLint setup does not count JSX member expressions as usage.
  const Ui = { TextAreaField };

  return (
    <fieldset className={styles.section}>
      <legend>Delivery/disponibilidad</legend>
      <p className={styles.sectionHint}>
        Control operativo sin campos nuevos fuera del contrato actual.
      </p>

      <label className={styles.field} htmlFor="settings-hours-override">
        <span className={styles.label}>Forzado de disponibilidad</span>
        <select
          aria-invalid={errors['hours.override'] ? 'true' : undefined}
          className={styles.select}
          disabled={disabled}
          id="settings-hours-override"
          onChange={(event) => onFieldChange('hours.override', event.target.value)}
          value={value.hours.override}
        >
          {OVERRIDE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {OVERRIDE_LABELS[option]}
            </option>
          ))}
        </select>
        {errors['hours.override'] ? (
          <span className={styles.error}>{errors['hours.override']}</span>
        ) : null}
      </label>

      <label className={styles.checkbox} htmlFor="settings-hours-alert-enabled">
        <input
          checked={Boolean(value.hours.alert.enabled)}
          disabled={disabled}
          id="settings-hours-alert-enabled"
          onChange={(event) => onFieldChange('hours.alert.enabled', event.target.checked)}
          type="checkbox"
        />
        Habilitar banner de alerta
      </label>
      <Ui.TextAreaField
        disabled={disabled}
        error={errors['hours.alert.message']}
        id="settings-hours-alert-message"
        label="Mensaje del banner"
        maxLength={280}
        onChange={(next) => onFieldChange('hours.alert.message', next)}
        value={value.hours.alert.message}
      />
      {value.hours.alert.enabled && !String(value.hours.alert.message || '').trim() ? (
        <p className={styles.sectionHint}>Recomendado: agrega un mensaje para la alerta.</p>
      ) : null}
    </fieldset>
  );
}
