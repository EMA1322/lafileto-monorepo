import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, getCurrentUser } from '@/utils/api.js';
import { isFeatureEnabled } from '@/utils/featureFlags.js';
import { canRead, canWrite, ensureRbacLoaded } from '@/utils/rbac.js';
import { AdminThemeScope, Badge, Button, Card, StateBlock } from '../ui/index.js';
import styles from './DashboardPage.module.css';

const FEATURE_SETTINGS = isFeatureEnabled(import.meta.env.VITE_FEATURE_SETTINGS);

const VIEW_STATUS = {
  loading: 'loading',
  error: 'error',
  empty: 'empty',
  success: 'success',
};

const QUICK_ACTIONS = [
  { label: 'Ver productos', href: '#products', module: 'products', permission: 'read' },
  { label: 'Nuevo producto', href: '#products', module: 'products', permission: 'write' },
  { label: 'Ver categorias', href: '#categories', module: 'categories', permission: 'read' },
  { label: 'Nueva categoria', href: '#categories', module: 'categories', permission: 'write' },
  ...(FEATURE_SETTINGS
    ? [{ label: 'Ir a configuracion', href: '#settings', module: 'settings', permission: 'read' }]
    : []),
];

function toNumberNonNegative(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : 0;
}

function toNullablePercent(value) {
  if (value === null || value === undefined || value === '') return null;
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return null;
  return Math.max(0, Math.round(numberValue));
}

function parseDate(value) {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(value) {
  const date = parseDate(value);
  if (!date) return 'Sin datos';
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(date);
}

function normalizeMode(value) {
  const mode = String(value || '')
    .trim()
    .toUpperCase();
  if (mode === 'FORCE_OPEN' || mode === 'FORCE_CLOSED' || mode === 'AUTO') return mode;
  return 'AUTO';
}

function resolveIsOpen(mode, businessIsOpen, statusIsOpen) {
  if (mode === 'FORCE_OPEN') return true;
  if (mode === 'FORCE_CLOSED') return false;
  if (typeof businessIsOpen === 'boolean') return businessIsOpen;
  return typeof statusIsOpen === 'boolean' ? statusIsOpen : null;
}

function normalizeSummary(summary) {
  if (!summary || typeof summary !== 'object') return null;

  const counts = summary.counts || {};
  const insights = summary.insights || {};
  const mode = normalizeMode(summary.status?.mode);
  const isOpen = resolveIsOpen(mode, summary.business?.isOpen, summary.status?.isOpen);
  const generatedAt = parseDate(summary.meta?.generatedAt)?.toISOString() || null;
  const nextChangeAt = parseDate(summary.business?.nextChangeAt)?.toISOString() || null;
  const activeOffers = toNumberNonNegative(counts.activeOffers ?? insights.offersActive);
  const offerPercent = toNullablePercent(insights.offerPercent);
  const activityItems = Array.isArray(summary.activity?.items) ? summary.activity.items : [];

  return {
    activityItems,
    activityNote: typeof summary.activity?.note === 'string' ? summary.activity.note : '',
    business: {
      isOpen,
      mode,
      nextChangeAt,
    },
    counts: {
      activeCategories: toNumberNonNegative(counts.activeCategories),
      activeOffers,
      activeProducts: toNumberNonNegative(counts.activeProducts),
      productsWithoutImage: toNumberNonNegative(counts.productsWithoutImage),
    },
    generatedAt,
    insights: {
      offerPercent,
      offersActive: activeOffers,
    },
  };
}

function hasRenderableData(summary) {
  if (!summary) return false;
  const total =
    summary.counts.activeProducts +
    summary.counts.activeCategories +
    summary.counts.activeOffers +
    summary.counts.productsWithoutImage;
  return total > 0 || summary.business.isOpen !== null || summary.insights.offerPercent !== null;
}

function resolveErrorMessage(error) {
  if (error?.status === 401) return 'Tu sesion expiro. Inicia sesion nuevamente para continuar.';
  if (error?.status === 403) return 'No tenes permisos para ver el panel general.';
  return error?.message || 'No se pudo cargar el resumen del panel.';
}

function getUserLabel() {
  const user = getCurrentUser() || null;
  const name =
    String(user?.name || user?.fullName || user?.username || '').trim() || 'Administrador';
  const role =
    String(user?.roleName || user?.role?.name || user?.role || user?.roleId || '').trim() ||
    'Rol activo';
  return { name, role };
}

function canUseAction(action) {
  if (action.permission === 'read') return canRead(action.module);
  if (action.permission === 'write') return canWrite(action.module);
  return false;
}

function formatActivityItem(item) {
  if (typeof item === 'string') return item;
  if (!item || typeof item !== 'object') return 'Actividad registrada.';

  const label = String(item.label || item.title || item.message || item.action || '').trim();
  const when = formatDateTime(item.createdAt || item.at || item.timestamp);
  return label ? `${label}${when === 'Sin datos' ? '' : ` - ${when}`}` : when;
}

function KpiTile({ label, value, tone = 'neutral' }) {
  return (
    <Card className={styles.metricTile} variant="elevated" aria-label={label}>
      <p className={styles.metricLabel}>{label}</p>
      <strong className={styles.metricValue}>{value}</strong>
      <span className={`${styles.metricBar} ${styles[tone]}`} aria-hidden="true" />
    </Card>
  );
}

function SummaryPanels({ summary }) {
  const isOpen = summary.business.isOpen;
  const businessLabel = isOpen === true ? 'Abierto' : isOpen === false ? 'Cerrado' : 'Sin datos';
  const businessVariant = isOpen === true ? 'success' : isOpen === false ? 'warning' : 'neutral';
  const productsWithoutImage = summary.counts.productsWithoutImage;

  return (
    <section className={styles.panelGrid} aria-label="Resumen operativo">
      <Card
        title="Estado del negocio"
        description="Lectura basada en la configuracion actual de horarios."
        variant="elevated"
      >
        <div className={styles.inlineStack}>
          <Badge variant={businessVariant}>{businessLabel}</Badge>
          <span className={styles.mutedText}>
            Proximo cambio: {formatDateTime(summary.business.nextChangeAt)}
          </span>
          <span className={styles.mutedText}>Modo: {summary.business.mode}</span>
        </div>
      </Card>

      <Card
        title="Checklist operativo"
        description="Indicadores simples derivados del resumen real."
        variant="elevated"
      >
        <ul className={styles.checkList}>
          <li>
            <span>Productos con imagen principal</span>
            <Badge variant={productsWithoutImage > 0 ? 'warning' : 'success'}>
              {productsWithoutImage > 0 ? `${productsWithoutImage} pendientes` : 'OK'}
            </Badge>
          </li>
          <li>
            <span>Ofertas activas monitoreadas</span>
            <Badge variant={summary.counts.activeOffers > 0 ? 'info' : 'neutral'}>
              {summary.counts.activeOffers}
            </Badge>
          </li>
          <li>
            <span>Estado horario disponible</span>
            <Badge variant={summary.business.isOpen === null ? 'neutral' : 'success'}>
              {summary.business.isOpen === null ? 'Sin datos' : 'OK'}
            </Badge>
          </li>
        </ul>
      </Card>

      <Card title="Insights" description="Sin graficos: solo datos disponibles." variant="elevated">
        <ul className={styles.insightList}>
          <li>
            <span>Catalogo en oferta</span>
            <strong>
              {summary.insights.offerPercent === null
                ? 'Sin datos'
                : `${summary.insights.offerPercent}%`}
            </strong>
          </li>
          <li>
            <span>Ofertas activas</span>
            <strong>{summary.insights.offersActive}</strong>
          </li>
          <li>
            <span>Productos sin imagen</span>
            <strong>{summary.counts.productsWithoutImage}</strong>
          </li>
        </ul>
      </Card>

      <Card
        title="Actividad"
        description="Se muestran items solo si el endpoint los devuelve."
        variant="elevated"
      >
        {summary.activityItems.length > 0 ? (
          <ul className={styles.activityList}>
            {summary.activityItems.slice(0, 5).map((item, index) => (
              <li key={`${formatActivityItem(item)}-${index}`}>{formatActivityItem(item)}</li>
            ))}
          </ul>
        ) : (
          <p className={styles.emptyText}>Todavia no hay actividad para mostrar.</p>
        )}
      </Card>
    </section>
  );
}

export default function DashboardPage() {
  // eslint-disable-next-line no-unused-vars -- This ESLint setup does not count JSX member expressions as usage.
  const Ui = { AdminThemeScope, Badge, Button, Card, StateBlock };
  // eslint-disable-next-line no-unused-vars -- This ESLint setup does not count JSX member expressions as usage.
  const View = { KpiTile, SummaryPanels };
  const [summary, setSummary] = useState(null);
  const [viewStatus, setViewStatus] = useState(VIEW_STATUS.loading);
  const [errorMessage, setErrorMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const user = useMemo(getUserLabel, []);

  const quickActions = useMemo(() => QUICK_ACTIONS.filter(canUseAction), [summary]);

  const loadSummary = useCallback(async ({ quiet = false } = {}) => {
    if (quiet) setRefreshing(true);
    else setViewStatus(VIEW_STATUS.loading);
    setErrorMessage('');

    try {
      await ensureRbacLoaded();
      const response = await apiFetch('/dashboard/summary', { method: 'GET' });
      const nextSummary = normalizeSummary(response?.data);
      setSummary(nextSummary);
      setViewStatus(hasRenderableData(nextSummary) ? VIEW_STATUS.success : VIEW_STATUS.empty);
    } catch (error) {
      setErrorMessage(resolveErrorMessage(error));
      setViewStatus(VIEW_STATUS.error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleNavigate = (href) => {
    window.location.hash = href;
  };

  const handleRefresh = () => {
    loadSummary({ quiet: viewStatus === VIEW_STATUS.success });
  };

  const isBusy = viewStatus === VIEW_STATUS.loading || refreshing;
  const generatedAt = summary?.generatedAt ? formatDateTime(summary.generatedAt) : 'Sin datos';

  return (
    <Ui.AdminThemeScope className={styles.theme}>
      <section className={styles.pageShell} aria-labelledby="dashboard-title" aria-busy={isBusy}>
        <p className={styles.statusAnnouncer} aria-live="polite">
          {viewStatus}
        </p>

        <header className={styles.pageHeader}>
          <div className={styles.headingBlock}>
            <Ui.Badge variant="accent">Dashboard React</Ui.Badge>
            <h1 id="dashboard-title" className={styles.title}>
              Panel general
            </h1>
            <p className={styles.subtitle}>
              Hola, {user.name}. Resumen operativo con datos reales del sistema.
            </p>
            <div className={styles.metaRow}>
              <Ui.Badge variant="neutral">{user.role}</Ui.Badge>
              <span>Ultima actualizacion: {generatedAt}</span>
            </div>
          </div>
          <Ui.Button variant="primary" loading={refreshing} onClick={handleRefresh}>
            Actualizar
          </Ui.Button>
        </header>

        {viewStatus === VIEW_STATUS.loading ? (
          <Ui.StateBlock
            className={styles.stateBlock}
            description="Estamos consultando el resumen operativo actual."
            status="loading"
            title="Cargando resumen del panel"
          />
        ) : null}

        {viewStatus === VIEW_STATUS.error ? (
          <Ui.StateBlock
            action={
              <Ui.Button variant="primary" onClick={handleRefresh}>
                Reintentar
              </Ui.Button>
            }
            className={styles.stateBlock}
            description={errorMessage}
            status="error"
            title="No se pudo cargar el panel"
          />
        ) : null}

        {viewStatus === VIEW_STATUS.empty ? (
          <Ui.StateBlock
            action={
              <Ui.Button variant="secondary" onClick={handleRefresh}>
                Actualizar
              </Ui.Button>
            }
            className={styles.stateBlock}
            description="El endpoint respondio, pero no hay datos suficientes para componer el panel."
            status="empty"
            title="No hay datos para mostrar"
          />
        ) : null}

        {viewStatus === VIEW_STATUS.success && summary ? (
          <div className={styles.successView}>
            <section className={styles.metricGrid} aria-label="Indicadores clave">
              <View.KpiTile label="Productos" value={summary.counts.activeProducts} tone="accent" />
              <View.KpiTile
                label="Categorias"
                value={summary.counts.activeCategories}
                tone="info"
              />
              <View.KpiTile label="En oferta" value={summary.counts.activeOffers} tone="warning" />
              <View.KpiTile
                label="Estado"
                value={
                  summary.business.isOpen === true
                    ? 'Abierto'
                    : summary.business.isOpen === false
                      ? 'Cerrado'
                      : 'Sin datos'
                }
                tone={summary.business.isOpen === true ? 'success' : 'neutral'}
              />
            </section>

            <Ui.Card
              className={styles.quickPanel}
              description="Accesos filtrados con los permisos actuales."
              title="Accesos rapidos"
              variant="elevated"
            >
              {quickActions.length > 0 ? (
                <div className={styles.quickGrid}>
                  {quickActions.map((action) => (
                    <button
                      key={`${action.href}-${action.label}`}
                      className={styles.quickAction}
                      onClick={() => handleNavigate(action.href)}
                      type="button"
                    >
                      <span>{action.label}</span>
                      <small>{action.href}</small>
                    </button>
                  ))}
                </div>
              ) : (
                <p className={styles.emptyText}>No hay accesos disponibles para tus permisos.</p>
              )}
            </Ui.Card>

            <View.SummaryPanels summary={summary} />
          </div>
        ) : null}
      </section>
    </Ui.AdminThemeScope>
  );
}
