import { TextAreaField, TextField } from './BrandingSection.jsx';
import styles from './SettingsForm.module.css';

export default function ContactSection({ disabled, errors, onFieldChange, value }) {
  // eslint-disable-next-line no-unused-vars -- This ESLint setup does not count JSX member expressions as usage.
  const Ui = { TextAreaField, TextField };

  return (
    <fieldset className={styles.section}>
      <legend>Contacto, WhatsApp y ubicacion</legend>
      <p className={styles.sectionHint}>
        Datos publicos que aparecen en Header, Footer, Contacto y Confirmacion cuando estan
        disponibles.
      </p>

      <div className={styles.grid}>
        <Ui.TextField
          disabled={disabled}
          error={errors['identity.phone']}
          hint="Se usa como telefono visible y como respaldo de WhatsApp si no hay numero cargado."
          id="settings-identity-phone"
          label="Telefono"
          onChange={(next) => onFieldChange('identity.phone', next)}
          type="tel"
          value={value.identity.phone}
        />
        <Ui.TextField
          disabled={disabled}
          error={errors['identity.email']}
          hint="Se muestra como contacto publico si el formato es valido."
          id="settings-identity-email"
          label="Email"
          onChange={(next) => onFieldChange('identity.email', next)}
          type="email"
          value={value.identity.email}
        />
        <Ui.TextAreaField
          disabled={disabled}
          error={errors['identity.address']}
          hint="Hasta 180 caracteres. El Client la muestra como direccion del local."
          id="settings-identity-address"
          label="Direccion"
          maxLength={180}
          onChange={(next) => onFieldChange('identity.address', next)}
          value={value.identity.address}
        />
        <Ui.TextField
          disabled={disabled}
          error={errors['whatsapp.number']}
          hint="Usa solo numeros o formato local. El sistema guarda solo digitos."
          id="settings-whatsapp-number"
          label="WhatsApp"
          onChange={(next) => onFieldChange('whatsapp.number', next)}
          type="tel"
          value={value.whatsapp.number}
        />
        <Ui.TextAreaField
          disabled={disabled}
          error={errors['whatsapp.message']}
          hint="Hasta 280 caracteres. Se usa para preparar el mensaje inicial de WhatsApp."
          id="settings-whatsapp-message"
          label="Mensaje CTA de WhatsApp"
          maxLength={280}
          onChange={(next) => onFieldChange('whatsapp.message', next)}
          value={value.whatsapp.message}
        />
        <Ui.TextAreaField
          disabled={disabled}
          error={errors['map.embedSrc']}
          hint="Pega el src de un iframe de Google Maps o una URL /maps/embed valida."
          id="settings-map-embed-src"
          label="Embed src de Google Maps"
          onChange={(next) => onFieldChange('map.embedSrc', next)}
          value={value.map.embedSrc}
        />
      </div>
    </fieldset>
  );
}
