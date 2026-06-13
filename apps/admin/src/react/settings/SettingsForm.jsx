import BrandingSection from './BrandingSection.jsx';
import ContactSection from './ContactSection.jsx';
import DeliverySection from './DeliverySection.jsx';
import HoursSection from './HoursSection.jsx';
import PaymentsSection from './PaymentsSection.jsx';
import SocialSection from './SocialSection.jsx';
import styles from './SettingsForm.module.css';

export default function SettingsForm({
  disabled = false,
  errors = {},
  onAddSocial,
  onFieldChange,
  onHourChange,
  onRemoveSocial,
  onSocialChange,
  value,
}) {
  // eslint-disable-next-line no-unused-vars -- This ESLint setup does not count JSX member expressions as usage.
  const View = {
    BrandingSection,
    ContactSection,
    DeliverySection,
    HoursSection,
    PaymentsSection,
    SocialSection,
  };

  return (
    <div className={styles.form}>
      <div className={styles.sections}>
        <View.BrandingSection
          disabled={disabled}
          errors={errors}
          onFieldChange={onFieldChange}
          value={value}
        />
        <View.ContactSection
          disabled={disabled}
          errors={errors}
          onFieldChange={onFieldChange}
          value={value}
        />
        <View.SocialSection
          disabled={disabled}
          errors={errors}
          onAddSocial={onAddSocial}
          onRemoveSocial={onRemoveSocial}
          onSocialChange={onSocialChange}
          value={value}
        />
        <View.PaymentsSection
          disabled={disabled}
          errors={errors}
          onFieldChange={onFieldChange}
          value={value}
        />
        <View.HoursSection
          disabled={disabled}
          errors={errors}
          onHourChange={onHourChange}
          value={value}
        />
        <View.DeliverySection
          disabled={disabled}
          errors={errors}
          onFieldChange={onFieldChange}
          value={value}
        />
      </div>
    </div>
  );
}
