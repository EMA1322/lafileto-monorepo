import { useMemo, useState } from 'react';
import styles from './SettingsForm.module.css';

function FieldMessage({ children, id, tone = 'hint' }) {
  if (!children) return null;

  return (
    <span className={tone === 'error' ? styles.error : styles.hint} id={id}>
      {children}
    </span>
  );
}

function getDescribedBy(id, hint, error) {
  return (
    [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined
  );
}

function TextField({
  disabled,
  error,
  hint,
  id,
  label,
  maxLength,
  onChange,
  type = 'text',
  value,
}) {
  return (
    <label className={styles.field} htmlFor={id}>
      <span className={styles.label}>{label}</span>
      <input
        aria-describedby={getDescribedBy(id, hint, error)}
        aria-invalid={error ? 'true' : undefined}
        className={styles.control}
        disabled={disabled}
        id={id}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
      <FieldMessage id={`${id}-hint`}>{hint}</FieldMessage>
      <FieldMessage id={`${id}-error`} tone="error">
        {error}
      </FieldMessage>
    </label>
  );
}

function TextAreaField({ disabled, error, hint, id, label, maxLength, onChange, value }) {
  return (
    <label className={styles.field} htmlFor={id}>
      <span className={styles.label}>{label}</span>
      <textarea
        aria-describedby={getDescribedBy(id, hint, error)}
        aria-invalid={error ? 'true' : undefined}
        className={styles.textarea}
        disabled={disabled}
        id={id}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
      <FieldMessage id={`${id}-hint`}>{hint}</FieldMessage>
      <FieldMessage id={`${id}-error`} tone="error">
        {error}
      </FieldMessage>
    </label>
  );
}

export default function BrandingSection({ disabled, errors, onFieldChange, value }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const logoUrl = String(value.brand.logo || '').trim();
  const canPreview = useMemo(() => /^https?:\/\//i.test(logoUrl), [logoUrl]);

  return (
    <fieldset className={styles.section}>
      <legend>Marca y SEO</legend>
      <p className={styles.sectionHint}>
        Identidad visual y metadatos que el Client usa en Header, Footer y Contacto.
      </p>

      <div className={styles.grid}>
        <TextField
          disabled={disabled}
          error={errors['brand.logo']}
          hint="Usa una URL http/https o deja vacio para mostrar la marca por defecto."
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
          <span className={styles.label}>Vista previa</span>
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
          hint="El favicon se aplica en el navegador cuando la URL es valida."
          id="settings-brand-favicon"
          label="Favicon (URL)"
          onChange={(next) => onFieldChange('brand.favicon', next)}
          type="url"
          value={value.brand.favicon}
        />
        <TextField
          disabled={disabled}
          error={errors['seo.contact.title']}
          hint="Hasta 70 caracteres."
          id="settings-seo-contact-title"
          label="Contacto - Meta titulo"
          maxLength={70}
          onChange={(next) => onFieldChange('seo.contact.title', next)}
          value={value.seo.contact.title}
        />
        <TextAreaField
          disabled={disabled}
          error={errors['seo.contact.description']}
          hint="Hasta 180 caracteres."
          id="settings-seo-contact-description"
          label="Contacto - Meta descripcion"
          maxLength={180}
          onChange={(next) => onFieldChange('seo.contact.description', next)}
          value={value.seo.contact.description}
        />
        <TextField
          disabled={disabled}
          error={errors['seo.about.title']}
          hint="Hasta 70 caracteres."
          id="settings-seo-about-title"
          label="Nosotros - Meta titulo"
          maxLength={70}
          onChange={(next) => onFieldChange('seo.about.title', next)}
          value={value.seo.about.title}
        />
        <TextAreaField
          disabled={disabled}
          error={errors['seo.about.description']}
          hint="Hasta 180 caracteres."
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

export { FieldMessage, TextAreaField, TextField };
