import { TextField } from './BrandingSection.jsx';
import styles from './SettingsForm.module.css';

export default function HoursSection({ disabled, errors, onHourChange, value }) {
  // eslint-disable-next-line no-unused-vars -- This ESLint setup does not count JSX member expressions as usage.
  const Ui = { TextField };

  const openingHours = Array.isArray(value.hours.openingHours) ? value.hours.openingHours : [];

  return (
    <fieldset className={styles.section}>
      <legend>Horarios</legend>
      <p className={styles.sectionHint}>
        Apertura semanal usada para calcular disponibilidad publica.
      </p>

      <div className={styles.hoursRows}>
        {openingHours.map((slot, index) => {
          const error = errors[`hours.openingHours.${index}`] || '';

          return (
            <div className={styles.hourRow} key={`${slot.day}-${index}`}>
              <div className={styles.dayLabel}>{slot.day}</div>
              <label className={styles.checkbox} htmlFor={`settings-hours-${index}-closed`}>
                <input
                  checked={Boolean(slot.closed)}
                  disabled={disabled}
                  id={`settings-hours-${index}-closed`}
                  onChange={(event) => onHourChange(index, 'closed', event.target.checked)}
                  type="checkbox"
                />
                Cerrado
              </label>
              <Ui.TextField
                disabled={disabled || Boolean(slot.closed)}
                error={error}
                id={`settings-hours-${index}-open`}
                label="Apertura"
                onChange={(next) => onHourChange(index, 'open', next)}
                type="time"
                value={slot.open}
              />
              <Ui.TextField
                disabled={disabled || Boolean(slot.closed)}
                error={error}
                id={`settings-hours-${index}-close`}
                label="Cierre"
                onChange={(next) => onHourChange(index, 'close', next)}
                type="time"
                value={slot.close}
              />
            </div>
          );
        })}
      </div>
      {errors['hours.openingHours'] ? (
        <p className={styles.error}>{errors['hours.openingHours']}</p>
      ) : null}
    </fieldset>
  );
}
