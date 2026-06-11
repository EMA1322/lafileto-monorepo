import { useEffect, useRef, useState } from 'react';

import { login } from '@/utils/auth.js';
import { AdminThemeScope, Button, Card, Input, StateBlock } from '../ui/index.js';
import styles from './LoginPage.module.css';

const AUTH_ERROR_MESSAGES = {
  AUTH_INVALID: 'Credenciales invalidas. Revisá el email y la contraseña.',
  AUTH_REQUIRED: 'Tu sesión expiró. Iniciá sesión nuevamente.',
  RATE_LIMITED: 'Demasiados intentos. Probá en unos minutos.',
  ACCOUNT_LOCKED: 'Cuenta bloqueada temporalmente.',
  INTERNAL_ERROR: 'No pudimos iniciar sesión. Intentá más tarde.',
};

const FALLBACK_ERROR = 'No pudimos iniciar sesión. Revisá tus datos e intentá nuevamente.';

function getAuthErrorMessage(error) {
  const code = error?.code ? String(error.code) : '';
  if (code && AUTH_ERROR_MESSAGES[code]) return AUTH_ERROR_MESSAGES[code];

  const message = typeof error?.message === 'string' ? error.message.trim() : '';
  if (message && !/^http\s+\d+/i.test(message)) return message;

  return FALLBACK_ERROR;
}

export default function LoginPage() {
  // eslint-disable-next-line no-unused-vars -- This ESLint setup does not count JSX member expressions as usage.
  const Ui = { AdminThemeScope, Button, Card, Input, StateBlock };
  const passwordRef = useRef(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [authError, setAuthError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.getElementById('admin-login-email')?.focus();
  }, []);

  function clearFormError(field) {
    setAuthError('');
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    const nextErrors = {};
    const normalizedEmail = email.trim();
    const normalizedPassword = password.trim();

    if (!normalizedEmail) nextErrors.email = 'Ingresá tu email.';
    if (!normalizedPassword) nextErrors.password = 'Ingresá tu contraseña.';

    setFieldErrors(nextErrors);
    setAuthError('');

    if (Object.keys(nextErrors).length > 0) {
      if (nextErrors.email) document.getElementById('admin-login-email')?.focus();
      else passwordRef.current?.focus();
      return;
    }

    setSubmitting(true);

    try {
      const result = await login(normalizedEmail, normalizedPassword);
      window.location.hash = result?.nextRoute || '#dashboard';
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
      setPassword('');
      passwordRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Ui.AdminThemeScope className={styles.theme}>
      <main className={styles.screen} aria-labelledby="login-title">
        <Ui.Card className={styles.panel} aria-label="Inicio de sesión administrador">
          <div className={styles.brandBlock}>
            <p className={styles.eyebrow}>Panel administrador</p>
            <h1 className={styles.title} id="login-title">
              La Fileto
            </h1>
            <p className={styles.subtitle}>Ingresá para gestionar el menú digital.</p>
          </div>

          <form className={styles.form} noValidate onSubmit={handleSubmit}>
            <Ui.Input
              autoComplete="username"
              className={styles.field}
              disabled={submitting}
              error={fieldErrors.email}
              id="admin-login-email"
              inputMode="email"
              label="Email"
              onChange={(event) => {
                setEmail(event.target.value);
                clearFormError('email');
              }}
              required
              type="email"
              value={email}
            />

            <div className={styles.passwordField}>
              <label className={styles.label} htmlFor="admin-login-password">
                Contraseña <span aria-hidden="true">*</span>
              </label>
              <div className={styles.passwordControl}>
                <input
                  aria-describedby={fieldErrors.password ? 'admin-login-password-error' : undefined}
                  aria-invalid={fieldErrors.password ? 'true' : undefined}
                  autoComplete="current-password"
                  className={styles.passwordInput}
                  disabled={submitting}
                  id="admin-login-password"
                  onChange={(event) => {
                    setPassword(event.target.value);
                    clearFormError('password');
                  }}
                  ref={passwordRef}
                  required
                  type={passwordVisible ? 'text' : 'password'}
                  value={password}
                />
                <Ui.Button
                  aria-label={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={passwordVisible}
                  className={styles.passwordToggle}
                  disabled={submitting}
                  onClick={() => setPasswordVisible((visible) => !visible)}
                  type="button"
                  variant="ghost"
                >
                  {passwordVisible ? 'Ocultar' : 'Mostrar'}
                </Ui.Button>
              </div>
              {fieldErrors.password ? (
                <p className={styles.fieldError} id="admin-login-password-error">
                  {fieldErrors.password}
                </p>
              ) : null}
            </div>

            {authError ? (
              <Ui.StateBlock
                className={styles.authError}
                description={authError}
                status="error"
                title="No pudimos iniciar sesión"
              />
            ) : null}

            <Ui.Button
              className={styles.submit}
              loading={submitting}
              type="submit"
              variant="primary"
            >
              {submitting ? 'Verificando' : 'Iniciar sesión'}
            </Ui.Button>
          </form>
        </Ui.Card>
      </main>
    </Ui.AdminThemeScope>
  );
}
