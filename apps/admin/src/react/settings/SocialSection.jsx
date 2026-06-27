import Button from '../ui/Button.jsx';
import { TextField } from './BrandingSection.jsx';
import styles from './SettingsForm.module.css';

export default function SocialSection({
  disabled,
  errors,
  onAddSocial,
  onRemoveSocial,
  onSocialChange,
  value,
}) {
  // eslint-disable-next-line no-unused-vars -- This ESLint setup does not count JSX member expressions as usage.
  const Ui = { Button, TextField };

  const links = Array.isArray(value.socialLinks) ? value.socialLinks : [];

  return (
    <fieldset className={styles.section}>
      <legend>Redes</legend>
      <p className={styles.sectionHint}>
        Links publicos del negocio. Header y Footer los muestran cuando tienen nombre y URL valida.
      </p>

      <div className={styles.socialRows}>
        {links.length ? (
          links.map((link, index) => (
            <div className={styles.socialRow} key={`social-${index}`}>
              <Ui.TextField
                disabled={disabled}
                error={errors[`socialLinks.${index}.label`]}
                hint="Ejemplo: Instagram."
                id={`settings-social-${index}-label`}
                label="Nombre"
                maxLength={40}
                onChange={(next) => onSocialChange(index, 'label', next)}
                value={link.label}
              />
              <Ui.TextField
                disabled={disabled}
                error={errors[`socialLinks.${index}.url`]}
                hint="Debe comenzar con http:// o https://."
                id={`settings-social-${index}-url`}
                label="URL"
                onChange={(next) => onSocialChange(index, 'url', next)}
                type="url"
                value={link.url}
              />
              <Ui.Button disabled={disabled} onClick={() => onRemoveSocial(index)} variant="ghost">
                Quitar
              </Ui.Button>
            </div>
          ))
        ) : (
          <p className={styles.sectionHint} role="status">
            No hay redes configuradas.
          </p>
        )}
      </div>

      <div className={styles.actions}>
        <Ui.Button disabled={disabled} onClick={onAddSocial} variant="secondary">
          Agregar red social
        </Ui.Button>
      </div>
      {errors.socialLinks ? <p className={styles.error}>{errors.socialLinks}</p> : null}
    </fieldset>
  );
}
