import { TextAreaField, TextField } from './BrandingSection.jsx';
import styles from './SettingsForm.module.css';

export default function ContactSection({ disabled, errors, onFieldChange, value }) {
  // eslint-disable-next-line no-unused-vars -- This ESLint setup does not count JSX member expressions as usage.
  const Ui = { TextAreaField, TextField };

  return (
    <fieldset className={styles.section}>
      <legend>Contacto</legend>
      <p className={styles.sectionHint}>Datos visibles en el sitio publico y CTA de WhatsApp.</p>

      <div className={styles.grid}>
        <Ui.TextField
          disabled={disabled}
          error={errors['identity.phone']}
          id="settings-identity-phone"
          label="Telefono"
          onChange={(next) => onFieldChange('identity.phone', next)}
          type="tel"
          value={value.identity.phone}
        />
        <Ui.TextField
          disabled={disabled}
          error={errors['identity.email']}
          id="settings-identity-email"
          label="Email"
          onChange={(next) => onFieldChange('identity.email', next)}
          type="email"
          value={value.identity.email}
        />
        <Ui.TextAreaField
          disabled={disabled}
          error={errors['identity.address']}
          id="settings-identity-address"
          label="Direccion"
          maxLength={180}
          onChange={(next) => onFieldChange('identity.address', next)}
          value={value.identity.address}
        />
        <Ui.TextField
          disabled={disabled}
          error={errors['whatsapp.number']}
          id="settings-whatsapp-number"
          label="WhatsApp"
          onChange={(next) => onFieldChange('whatsapp.number', next)}
          type="tel"
          value={value.whatsapp.number}
        />
        <Ui.TextAreaField
          disabled={disabled}
          error={errors['whatsapp.message']}
          id="settings-whatsapp-message"
          label="Mensaje CTA de WhatsApp"
          maxLength={280}
          onChange={(next) => onFieldChange('whatsapp.message', next)}
          value={value.whatsapp.message}
        />
        <Ui.TextAreaField
          disabled={disabled}
          error={errors['map.embedSrc']}
          id="settings-map-embed-src"
          label="Embed src de Google Maps"
          onChange={(next) => onFieldChange('map.embedSrc', next)}
          value={value.map.embedSrc}
        />
      </div>
    </fieldset>
  );
}
