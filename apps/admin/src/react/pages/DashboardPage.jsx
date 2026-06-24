import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Clock3,
  ImageOff,
  Layers3,
  PackageCheck,
  RefreshCw,
  Settings,
  Store,
  Tags,
} from 'lucide-react';
import { apiFetch, getCurrentUser } from '@/utils/api.js';
import { isFeatureEnabled } from '@/utils/featureFlags.js';
import { canRead, ensureRbacLoaded } from '@/utils/rbac.js';
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
  {
    description: 'Revisar catalogo, imagenes y publicacion.',
    href: '#products',
    icon: PackageCheck,
    label: 'Productos',
    module: 'products',
  },
  {
    description: 'Ordenar categorias visibles del menu.',
    href: '#categories',
    icon: Layers3,
    label: 'Categorias',
    module: 'categories',
  },
  ...(FEATURE_SETTINGS
    ? [
        {
          description: 'Consultar horarios y datos operativos.',
          href: '#settings',
          icon: Settings,
          label: 'Configuracion',
          module: 'settings',
        },
      ]
    : []),
];

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

function toNumberNonNegative(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : 0;
}

function parseDate(value) {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(value) {
  const date = parseDate(value);
  if (!date) return 'No disponible';
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

function normalizeActivityItems(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(Boolean).slice(0, 5);
}

function normalizeSummary(summary) {
  if (!summary || typeof summary !== 'object') return null;

  const counts = summary.counts || {};
  const mode = normalizeMode(summary.status?.mode);
  const isOpen = resolveIsOpen(mode, summary.business?.isOpen, summary.status?.isOpen);

  return {
    activityItems: normalizeActivityItems(summary.activity?.items),
    business: {
      isOpen,
      mode,
      nextChangeAt: parseDate(summary.business?.nextChangeAt)?.toISOString() || null,
    },
    counts: {
      activeCategories: toNumberNonNegative(counts.activeCategories),
      activeOffers: toNumberNonNegative(counts.activeOffers),
      activeProducts: toNumberNonNegative(counts.activeProducts),
      productsWithoutImage: toNumberNonNegative(counts.productsWithoutImage),
    },
    generatedAt: parseDate(summary.meta?.generatedAt)?.toISOString() || null,
  };
}

function hasRenderableData(summary) {
  if (!summary) return false;
  const total =
    summary.counts.activeProducts +
    summary.counts.activeCategories +
    summary.counts.activeOffers +
    summary.counts.productsWithoutImage;
  return total > 0 || summary.business.isOpen !== null || summary.generatedAt !== null;
}

function resolveErrorMessage(error) {
  if (error?.status === 401) return 'Tu sesion expiro. Inicia sesion nuevamente para continuar.';
  if (error?.status === 403) return 'No tenes permisos para ver el panel general.';
  return error?.message || 'No se pudo cargar el resumen del panel. Volve a intentarlo.';
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
  return canRead(action.module);
}

function businessCopy(summary) {
  const isOpen = summary.business.isOpen;
  if (isOpen === true) {
    return {
      badge: 'Abierto',
      detail: 'El estado llega desde el resumen operativo actual.',
      tone: 'success',
    };
  }
  if (isOpen === false) {
    return {
      badge: 'Cerrado',
      detail: 'El estado llega desde el resumen operativo actual.',
      tone: 'warning',
    };
  }
  return {
    badge: 'Sin datos',
    detail: 'El resumen no informa estado abierto o cerrado.',
    tone: 'neutral',
  };
}

function formatMode(mode) {
  const labels = {
    AUTO: 'Automatico',
    FORCE_CLOSED: 'Forzado cerrado',
    FORCE_OPEN: 'Forzado abierto',
  };
  return labels[mode] || 'Automatico';
}

function formatActivityItem(item) {
  if (typeof item === 'string') return item;
  if (!item || typeof item !== 'object') return 'Actividad registrada.';

  const label = String(item.label || item.title || item.message || item.action || '').trim();
  const when = formatDateTime(item.createdAt || item.at || item.timestamp);
  return label ? `${label}${when === 'No disponible' ? '' : ` - ${when}`}` : when;
}

function KpiTile({ icon: Icon, label, value, tone = 'neutral' }) {
  return (
    <Card className={styles.metricTile} variant="elevated" aria-label={label}>
      <span className={cx(styles.metricIcon, styles[tone])} aria-hidden="true">
        <Icon size={18} strokeWidth={2.1} />
      </span>
      <p className={styles.metricLabel}>{label}</p>
      <strong className={styles.metricValue}>{value}</strong>
    </Card>
  );
}

function BusinessStatus({ summary }) {
  const status = businessCopy(summary);
  const hasNextChange = Boolean(summary.business.nextChangeAt);

  return (
    <Card
      className={styles.businessCard}
      title="Estado del negocio"
      description="Sin inferencias locales: se muestra solo lo que entrega el resumen."
      variant="elevated"
    >
      <div className={styles.businessRow}>
        <span className={cx(styles.businessIcon, styles[status.tone])} aria-hidden="true">
          <Store size={22} strokeWidth={2.1} />
        </span>
        <div className={styles.businessText}>
          <Badge variant={status.tone}>{status.badge}</Badge>
          <p>{status.detail}</p>
        </div>
      </div>
      <dl className={styles.detailList}>
        <div>
          <dt>Modo</dt>
          <dd>{formatMode(summary.business.mode)}</dd>
        </div>
        <div>
          <dt>Proximo cambio</dt>
          <dd>{hasNextChange ? formatDateTime(summary.business.nextChangeAt) : 'No informado'}</dd>
        </div>
      </dl>
    </Card>
  );
}

function PendingPanel({ summary }) {
  const productsWithoutImage = summary.counts.productsWithoutImage;

  return (
    <Card
      title="Pendientes"
      description="Pendientes disponibles en el contrato actual."
      variant="elevated"
    >
      <ul className={styles.pendingList}>
        <li>
          <span className={styles.pendingIcon} aria-hidden="true">
            <ImageOff size={18} strokeWidth={2.1} />
          </span>
          <div>
            <strong>Productos sin imagen</strong>
            <p>Requieren imagen principal para mejorar la lectura del menu.</p>
          </div>
          <Badge variant={productsWithoutImage > 0 ? 'warning' : 'success'}>
            {productsWithoutImage}
          </Badge>
        </li>
      </ul>
      <p className={styles.contractNote}>
        Productos no publicables no se muestra porque el summary actual no entrega ese dato.
      </p>
    </Card>
  );
}

function ActivityPanel({ summary }) {
  return (
    <Card
      title="Actividad"
      description="Sin historial inventado: solo items entregados por el endpoint."
      variant="elevated"
    >
      {summary.activityItems.length > 0 ? (
        <ul className={styles.activityList}>
          {summary.activityItems.map((item, index) => (
            <li key={`${formatActivityItem(item)}-${index}`}>
              <Activity size={16} strokeWidth={2.1} aria-hidden="true" />
              <span>{formatActivityItem(item)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.emptyText}>No hay actividad reciente disponible.</p>
      )}
    </Card>
  );
}

function QuickActions({ actions }) {
  return (
    <Card
      className={styles.quickPanel}
      description="Accesos a rutas hash existentes y visibles segun RBAC."
      title="Acciones rapidas"
      variant="elevated"
    >
      {actions.length > 0 ? (
        <div className={styles.quickGrid}>
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <a key={action.href} className={styles.quickAction} href={action.href}>
                <span className={styles.quickIcon} aria-hidden="true">
                  <Icon size={18} strokeWidth={2.1} />
                </span>
                <span>
                  <strong>{action.label}</strong>
                  <small>{action.description}</small>
                </span>
              </a>
            );
          })}
        </div>
      ) : (
        <p className={styles.emptyText}>No hay acciones disponibles para tus permisos.</p>
      )}
    </Card>
  );
}

export default function DashboardPage() {
  // eslint-disable-next-line no-unused-vars -- This ESLint setup does not count JSX member expressions as usage.
  const Ui = { AdminThemeScope, Badge, Button, Card, StateBlock };
  // eslint-disable-next-line no-unused-vars -- This ESLint setup does not count JSX member expressions as usage.
  const View = { ActivityPanel, BusinessStatus, KpiTile, PendingPanel, QuickActions };
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

  const handleRefresh = () => {
    loadSummary({ quiet: viewStatus === VIEW_STATUS.success });
  };

  const isBusy = viewStatus === VIEW_STATUS.loading || refreshing;
  const generatedAt = summary?.generatedAt ? formatDateTime(summary.generatedAt) : 'No disponible';

  return (
    <Ui.AdminThemeScope className={styles.theme}>
      <section className={styles.pageShell} aria-labelledby="dashboard-title" aria-busy={isBusy}>
        <p className={styles.statusAnnouncer} aria-live="polite">
          {isBusy ? 'Actualizando resumen' : viewStatus}
        </p>

        <header className={styles.pageHeader}>
          <div className={styles.headingBlock}>
            <Ui.Badge variant="accent">Dashboard operativo</Ui.Badge>
            <h1 id="dashboard-title" className={styles.title}>
              Panel general
            </h1>
            <p className={styles.subtitle}>
              Hola, {user.name}. Vista compacta con datos reales del resumen actual.
            </p>
            <div className={styles.metaRow}>
              <Ui.Badge variant="neutral">{user.role}</Ui.Badge>
              <span>
                <Clock3 size={15} strokeWidth={2.1} aria-hidden="true" />
                Resumen generado: {generatedAt}
              </span>
            </div>
          </div>
          <Ui.Button variant="primary" loading={refreshing} onClick={handleRefresh}>
            <RefreshCw size={16} strokeWidth={2.2} aria-hidden="true" />
            Actualizar resumen
          </Ui.Button>
        </header>

        {viewStatus === VIEW_STATUS.loading ? (
          <Ui.StateBlock
            className={styles.stateBlock}
            description="Consultando GET /dashboard/summary."
            status="loading"
            title="Cargando resumen del panel"
          />
        ) : null}

        {viewStatus === VIEW_STATUS.error ? (
          <Ui.StateBlock
            action={
              <Ui.Button variant="primary" onClick={handleRefresh}>
                <RefreshCw size={16} strokeWidth={2.2} aria-hidden="true" />
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
                <RefreshCw size={16} strokeWidth={2.2} aria-hidden="true" />
                Actualizar resumen
              </Ui.Button>
            }
            className={styles.stateBlock}
            description="El endpoint respondio, pero no hay datos operativos para componer el panel."
            status="empty"
            title="No hay datos para mostrar"
          />
        ) : null}

        {viewStatus === VIEW_STATUS.success && summary ? (
          <div className={styles.successView}>
            <section className={styles.metricGrid} aria-label="Metricas compactas">
              <View.KpiTile
                icon={PackageCheck}
                label="Productos activos"
                value={summary.counts.activeProducts}
                tone="accent"
              />
              <View.KpiTile
                icon={Layers3}
                label="Categorias activas"
                value={summary.counts.activeCategories}
                tone="info"
              />
              <View.KpiTile
                icon={Tags}
                label="Ofertas activas"
                value={summary.counts.activeOffers}
                tone="warning"
              />
              <View.KpiTile
                icon={ImageOff}
                label="Sin imagen"
                value={summary.counts.productsWithoutImage}
                tone={summary.counts.productsWithoutImage > 0 ? 'warning' : 'success'}
              />
            </section>

            <section className={styles.operationalGrid} aria-label="Estado y pendientes">
              <View.BusinessStatus summary={summary} />
              <View.PendingPanel summary={summary} />
            </section>

            <section className={styles.lowerGrid} aria-label="Acciones y actividad">
              <View.QuickActions actions={quickActions} />
              <View.ActivityPanel summary={summary} />
            </section>
          </div>
        ) : null}
      </section>
    </Ui.AdminThemeScope>
  );
}
