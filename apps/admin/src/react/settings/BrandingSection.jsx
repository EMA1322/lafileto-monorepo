import { useMemo, useState } from 'react';
import styles from './SettingsForm.module.css';

function TextField({ disabled, error, id, label, maxLength, onChange, type = 'text', value }) {
  return (
    <label className={styles.field} htmlFor={id}>
      <span className={styles.label}>{label}</span>
      <input
        aria-invalid={error ? 'true' : undefined}
        className={styles.control}
        disabled={disabled}
        id={id}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
      {error ? <span className={styles.error}>{error}</span> : null}
    </label>
  );
}

function TextAreaField({ disabled, error, id, label, maxLength, onChange, value }) {
  return (
    <label className={styles.field} htmlFor={id}>
      <span className={styles.label}>{label}</span>
      <textarea
        aria-invalid={error ? 'true' : undefined}
        className={styles.textarea}
        disabled={disabled}
        id={id}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
      {error ? <span className={styles.error}>{error}</span> : null}
    </label>
  );
}

export default function BrandingSection({ disabled, errors, onFieldChange, value }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const logoUrl = String(value.brand.logo || '').trim();
  const canPreview = useMemo(() => /^https?:\/\//i.test(logoUrl), [logoUrl]);

  return (
    <fieldset className={styles.section}>
      <legend>Branding</legend>
      <p className={styles.sectionHint}>Logo, favicon y SEO publico asociados al negocio.</p>

      <div className={styles.grid}>
        <TextField
          disabled={disabled}
          error={errors['brand.logo']}
          id="settings-brand-logo"
          label="Logo (URL)"
          onChange={(next) => {
            setLogoFailed(false);
            onFieldChange('brand.logo', next);
          }}
          type="url"
          value={value.brand.logo}
        />
        <div className={styles.preview} aria-label="Vista previa del logo">
          <span className={styles.label}>Preview</span>
          <div className={styles.logoPreview}>
            {canPreview && !logoFailed ? (
              <img alt="Logo configurado" onError={() => setLogoFailed(true)} src={logoUrl} />
            ) : (
              <span>Sin logo</span>
            )}
          </div>
        </div>
        <TextField
          disabled={disabled}
          error={errors['brand.favicon']}
          id="settings-brand-favicon"
          label="Favicon (URL)"
          onChange={(next) => onFieldChange('brand.favicon', next)}
          type="url"
          value={value.brand.favicon}
        />
        <TextField
          disabled={disabled}
          error={errors['seo.contact.title']}
          id="settings-seo-contact-title"
          label="Contacto - Meta titulo"
          maxLength={70}
          onChange={(next) => onFieldChange('seo.contact.title', next)}
          value={value.seo.contact.title}
        />
        <TextAreaField
          disabled={disabled}
          error={errors['seo.contact.description']}
          id="settings-seo-contact-description"
          label="Contacto - Meta descripcion"
          maxLength={180}
          onChange={(next) => onFieldChange('seo.contact.description', next)}
          value={value.seo.contact.description}
        />
        <TextField
          disabled={disabled}
          error={errors['seo.about.title']}
          id="settings-seo-about-title"
          label="Nosotros - Meta titulo"
          maxLength={70}
          onChange={(next) => onFieldChange('seo.about.title', next)}
          value={value.seo.about.title}
        />
        <TextAreaField
          disabled={disabled}
          error={errors['seo.about.description']}
          id="settings-seo-about-description"
          label="Nosotros - Meta descripcion"
          maxLength={180}
          onChange={(next) => onFieldChange('seo.about.description', next)}
          value={value.seo.about.description}
        />
      </div>
    </fieldset>
  );
}

export { TextAreaField, TextField };
