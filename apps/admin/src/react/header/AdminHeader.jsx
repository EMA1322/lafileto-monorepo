import { useCallback, useEffect, useMemo, useState } from 'react';
import { getIconHref } from '@/utils/icons.js';
import { getCurrentUser, logout } from '@/utils/auth.js';
import { canRead, ensureRbacLoaded } from '@/utils/rbac.js';
import { openModal, closeModal } from '@/utils/modals.js';
import notify from '@/utils/notify.js';
// eslint-disable-next-line no-unused-vars -- This ESLint setup does not count JSX component usage.
import { AdminThemeScope } from '../ui/index.js';
import {
  getHeaderUserName,
  getHeaderUserRole,
  isHeaderRouteActive,
} from './adminHeader.helpers.js';
import { getActiveHeaderRoute, getVisibleHeaderNavItems } from './headerNavigation.helpers.js';
import useHeaderBranding from './useHeaderBranding.js';
import useHeaderDrawer from './useHeaderDrawer.js';
import styles from './AdminHeader.module.css';

// eslint-disable-next-line no-unused-vars -- This ESLint setup does not count JSX component usage.
function Icon({ name, className = '' }) {
  return (
    <svg className={className || styles.icon} aria-hidden="true" focusable="false">
      <use href={getIconHref(name)} />
    </svg>
  );
}

export default function AdminHeader({ featureSettings = false }) {
  const [activeRoute, setActiveRoute] = useState(() => getActiveHeaderRoute(window.location.hash));
  const [permissionsReady, setPermissionsReady] = useState(false);
  const { logoUrl, onLogoError } = useHeaderBranding();
  const { closeDrawer, drawerRef, isDrawerOpen, toggleButtonRef, toggleDrawer } = useHeaderDrawer();

  useEffect(() => {
    let mounted = true;
    ensureRbacLoaded()
      .catch(() => null)
      .finally(() => {
        if (mounted) setPermissionsReady(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      setActiveRoute(getActiveHeaderRoute(window.location.hash));
    };

    window.addEventListener('hashchange', onHashChange);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);

  const navItems = useMemo(
    () =>
      getVisibleHeaderNavItems({
        canReadModule: canRead,
        featureSettings,
      }),
    [featureSettings, permissionsReady],
  );

  const currentUser = getCurrentUser() || {};
  const userName = getHeaderUserName(currentUser);
  const userRole = getHeaderUserRole(currentUser);

  const handleLogout = useCallback(() => {
    closeDrawer();

    const modalHtml = `
      <div>
        <p>Confirma que queres cerrar la sesion actual.</p>
        <div style="display:flex; gap:.5rem; justify-content:flex-end; margin-top:1rem;">
          <button class="btn btn--secondary" type="button" data-close-modal>Cancelar</button>
          <button id="confirmHeaderLogoutBtn" class="btn btn--danger" type="button">Cerrar sesion</button>
        </div>
      </div>
    `;

    openModal(modalHtml, '#confirmHeaderLogoutBtn', 'Cerrar sesion');

    const confirmBtn = document.getElementById('confirmHeaderLogoutBtn');
    if (!confirmBtn) return;

    const onConfirm = async () => {
      try {
        confirmBtn.disabled = true;
        closeModal();
        await logout();
        notify('Sesion cerrada correctamente', 'success', 2400);
      } catch {
        confirmBtn.disabled = false;
        notify('No se pudo cerrar sesion', 'error', 3000);
      } finally {
        confirmBtn.removeEventListener('click', onConfirm);
      }
    };

    confirmBtn.addEventListener('click', onConfirm);
  }, [closeDrawer]);

  return (
    <AdminThemeScope className={styles.scope} data-admin-react-header="true">
      <a href="#app" className={styles.skipLink}>
        Saltar al contenido
      </a>

      <div className={styles.bar} role="banner" aria-label="Encabezado principal del panel">
        <a href="#dashboard" className={styles.brand} aria-label="Ir al dashboard">
          {logoUrl ? (
            <img
              className={styles.brandLogo}
              src={logoUrl}
              alt="Logo del negocio"
              loading="eager"
              decoding="async"
              onError={onLogoError}
            />
          ) : (
            <>
              <Icon name="dashboard" className={styles.brandIcon} />
              <span className={styles.brandText}>Panel de administracion</span>
            </>
          )}
        </a>

        <nav className={styles.desktopNav} aria-label="Navegacion principal">
          <HeaderNav items={navItems} activeRoute={activeRoute} />
        </nav>

        <div className={styles.account} aria-live="polite">
          <span className={styles.userPill} aria-label="Usuario actual">
            <span className={styles.userName}>{userName}</span>
            <span className={styles.rolePill}>{userRole}</span>
          </span>
          <button className={styles.logoutButton} type="button" onClick={handleLogout}>
            <Icon name="logout" className={styles.buttonIcon} />
            <span>Cerrar sesion</span>
          </button>
        </div>

        <button
          ref={toggleButtonRef}
          className={styles.menuButton}
          type="button"
          aria-label="Abrir menu de navegacion"
          aria-controls="adminHeaderDrawer"
          aria-expanded={isDrawerOpen}
          onClick={toggleDrawer}
        >
          <Icon name="menu" className={styles.buttonIcon} />
        </button>
      </div>

      <div
        className={styles.overlay}
        data-open={isDrawerOpen ? 'true' : 'false'}
        hidden={!isDrawerOpen}
        onClick={closeDrawer}
      />

      <aside
        id="adminHeaderDrawer"
        ref={drawerRef}
        className={styles.drawer}
        data-open={isDrawerOpen ? 'true' : 'false'}
        aria-hidden={!isDrawerOpen}
        aria-labelledby="adminHeaderDrawerTitle"
        inert={isDrawerOpen ? undefined : ''}
        tabIndex={-1}
      >
        <div className={styles.drawerHeader}>
          <h2 id="adminHeaderDrawerTitle" className={styles.drawerTitle}>
            Menu
          </h2>
          <button
            className={styles.closeButton}
            type="button"
            aria-label="Cerrar menu de navegacion"
            onClick={closeDrawer}
          >
            <Icon name="close" className={styles.buttonIcon} />
          </button>
        </div>

        <nav className={styles.drawerNav} aria-label="Navegacion principal">
          <HeaderNav items={navItems} activeRoute={activeRoute} onNavigate={closeDrawer} />
        </nav>

        <div className={styles.drawerFooter}>
          <span className={styles.userPill} aria-label="Usuario actual">
            <span className={styles.userName}>{userName}</span>
            <span className={styles.rolePill}>{userRole}</span>
          </span>
          <button className={styles.logoutButton} type="button" onClick={handleLogout}>
            <Icon name="logout" className={styles.buttonIcon} />
            <span>Cerrar sesion</span>
          </button>
        </div>
      </aside>
    </AdminThemeScope>
  );
}

// eslint-disable-next-line no-unused-vars -- This ESLint setup does not count JSX component usage.
function HeaderNav({ activeRoute, items, onNavigate }) {
  return (
    <ul className={styles.navList}>
      {items.map((item) => {
        const isActive = isHeaderRouteActive(item, activeRoute);
        return (
          <li key={item.key} className={styles.navItem}>
            <a
              className={styles.navLink}
              data-module-key={item.key}
              href={item.hash}
              aria-current={isActive ? 'page' : undefined}
              onClick={onNavigate}
            >
              <Icon name={item.icon} className={styles.navIcon} />
              <span>{item.label}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
