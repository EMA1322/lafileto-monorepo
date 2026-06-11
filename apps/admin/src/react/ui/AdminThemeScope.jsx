import '../styles/adminTokens.css';
import styles from './AdminThemeScope.module.css';

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function AdminThemeScope({ children, className = '', ...props }) {
  return (
    <div className={cx('adminReactTheme', styles.scope, className)} {...props}>
      {children}
    </div>
  );
}
