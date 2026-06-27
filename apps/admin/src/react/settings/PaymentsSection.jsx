import { TextField } from './BrandingSection.jsx';
import { formatCbuMask } from './settingsValidation.helpers.js';
import styles from './SettingsForm.module.css';

export default function PaymentsSection({ disabled, errors, onFieldChange, value }) {
  // eslint-disable-next-line no-unused-vars -- This ESLint setup does not count JSX member expressions as usage.
  const Ui = { TextField };

  const paymentsEnabled = Boolean(value.payments.enabled);
  const paymentFieldsDisabled = disabled || !paymentsEnabled;

  return (
    <fieldset className={styles.section}>
      <legend>Pagos</legend>
      <p className={styles.sectionHint}>
        Datos para transferencias. El Client solo los publica cuando la transferencia esta
        habilitada.
      </p>

      <label className={styles.checkbox} htmlFor="settings-payments-enabled">
        <input
          checked={paymentsEnabled}
          disabled={disabled}
          id="settings-payments-enabled"
          onChange={(event) => onFieldChange('payments.enabled', event.target.checked)}
          type="checkbox"
        />
        Habilitar pagos por transferencia
      </label>
      <p className={styles.inlineStatus} role="status">
        {paymentsEnabled
          ? 'Transferencia visible en Contacto si hay datos cargados.'
          : 'Transferencia oculta para el Client publico.'}
      </p>
      {errors.payments ? <p className={styles.error}>{errors.payments}</p> : null}
      {errors['payments.enabled'] ? (
        <p className={styles.error}>{errors['payments.enabled']}</p>
      ) : null}

      <div className={styles.grid}>
        <Ui.TextField
          disabled={paymentFieldsDisabled}
          error={errors['payments.bankName']}
          hint="Hasta 80 caracteres."
          id="settings-payments-bank-name"
          label="Banco"
          maxLength={80}
          onChange={(next) => onFieldChange('payments.bankName', next)}
          value={value.payments.bankName}
        />
        <Ui.TextField
          disabled={paymentFieldsDisabled}
          error={errors['payments.cbu']}
          hint="22 digitos. Puede escribirse con espacios."
          id="settings-payments-cbu"
          label="CBU"
          onChange={(next) => onFieldChange('payments.cbu', formatCbuMask(next))}
          value={formatCbuMask(value.payments.cbu)}
        />
        <Ui.TextField
          disabled={paymentFieldsDisabled}
          error={errors['payments.alias']}
          hint="Hasta 40 caracteres."
          id="settings-payments-alias"
          label="Alias"
          maxLength={40}
          onChange={(next) => onFieldChange('payments.alias', next)}
          value={value.payments.alias}
        />
        <Ui.TextField
          disabled={paymentFieldsDisabled}
          error={errors['payments.cuit']}
          hint="11 digitos, sin guiones."
          id="settings-payments-cuit"
          label="CUIT"
          onChange={(next) => onFieldChange('payments.cuit', next)}
          value={value.payments.cuit}
        />
      </div>
    </fieldset>
  );
}
