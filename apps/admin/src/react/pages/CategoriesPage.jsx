import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, Pencil, Trash2 } from 'lucide-react';
import { categoriesApi } from '@/utils/apis.js';
import { canDelete, canRead, canUpdate, canWrite } from '@/utils/rbac.js';
import {
  AdminThemeScope,
  Badge,
  Button,
  IconAction,
  Input,
  ListPagination,
  ListSurface,
  ListSurfaceFooter,
  ListSurfaceHeader,
  Select,
  StateBlock,
  TableScroll,
  TableShell,
  TableToolbar,
} from '../ui/index.js';
import CategoryDeleteDialog from '../categories/CategoryDeleteDialog.jsx';
import CategoryForm from '../categories/CategoryForm.jsx';
import {
  DEFAULT_FILTERS,
  PAGE_SIZE_OPTIONS,
  buildCategoriesQuery,
  formatProductCount,
  normalizeCategoriesResponse,
  normalizeFilters,
  parseFiltersFromHash,
  serializeFiltersToHash,
} from '../categories/categoriesList.helpers.js';
import styles from './CategoriesPage.module.css';

const VIEW_STATUS = {
  loading: 'loading',
  error: 'error',
  empty: 'empty',
  success: 'success',
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'active', label: 'Activas' },
  { value: 'inactive', label: 'Inactivas' },
];

const ORDER_OPTIONS = [
  { value: 'name', label: 'Nombre' },
  { value: 'createdAt', label: 'Creacion' },
];

const ORDER_DIRECTION_OPTIONS = [
  { value: 'asc', label: 'Ascendente' },
  { value: 'desc', label: 'Descendente' },
];

function CategoryImage({ category }) {
  if (category.imageUrl) {
    return (
      <img
        alt={`Imagen de ${category.name}`}
        className={styles.categoryImage}
        decoding="async"
        height="52"
        loading="lazy"
        src={category.imageUrl}
        width="64"
      />
    );
  }

  return (
    <span className={styles.categoryPlaceholder} aria-hidden="true">
      Sin imagen
    </span>
  );
}

function StatusBadge({ active }) {
  return <Badge variant={active ? 'success' : 'warning'}>{active ? 'Activa' : 'Inactiva'}</Badge>;
}

function CategoryActions({ category, onDelete, onEdit, onToggle, permissions, togglingId }) {
  const hasActions = permissions.canUpdate || permissions.canDelete;

  if (!hasActions) {
    return <span className={styles.muted}>Sin acciones</span>;
  }

  const isToggling = String(togglingId || '') === String(category.id);

  return (
    <div className={styles.actions} aria-label="Acciones de categoria">
      {permissions.canUpdate ? (
        <>
          <IconAction
            icon={<Pencil />}
            label={`Editar categoria: ${category.name}`}
            onClick={() => onEdit(category)}
          />
          <IconAction
            disabled={isToggling}
            icon={category.active ? <EyeOff /> : <Eye />}
            label={`${category.active ? 'Desactivar' : 'Activar'} categoria: ${category.name}`}
            onClick={() => onToggle(category)}
          />
        </>
      ) : null}
      {permissions.canDelete ? (
        <IconAction
          className={styles.deleteAction}
          icon={<Trash2 />}
          label={`Eliminar categoria: ${category.name}`}
          onClick={() => onDelete(category)}
        />
      ) : null}
    </div>
  );
}

function CategoriesTable({ items, onDelete, onEdit, onToggle, permissions, togglingId }) {
  return (
    <TableScroll className={styles.tableScroll}>
      <table aria-describedby="categories-meta" className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Categoria</th>
            <th scope="col">Productos</th>
            <th scope="col">Estado</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map((category) => (
            <tr key={category.id}>
              <td>
                <div className={styles.categoryCell}>
                  <CategoryImage category={category} />
                  <div className={styles.categorySummary}>
                    <strong>{category.name}</strong>
                    <span className={styles.categoryUrl}>
                      {category.imageUrl || 'Sin URL de imagen'}
                    </span>
                  </div>
                </div>
              </td>
              <td className={styles.countCell}>{formatProductCount(category.productCount)}</td>
              <td>
                <StatusBadge active={category.active} />
              </td>
              <td>
                <CategoryActions
                  category={category}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onToggle={onToggle}
                  permissions={permissions}
                  togglingId={togglingId}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroll>
  );
}

function CategoriesCards({ items, onDelete, onEdit, onToggle, permissions, togglingId }) {
  return (
    <div className={styles.mobileList}>
      {items.map((category) => (
        <article className={styles.mobileItem} key={category.id}>
          <CategoryImage category={category} />
          <div className={styles.mobileBody}>
            <div className={styles.mobileHeader}>
              <div>
                <h2>{category.name}</h2>
                <p className={styles.categoryUrl}>{category.imageUrl || 'Sin URL de imagen'}</p>
              </div>
              <StatusBadge active={category.active} />
            </div>
            <div className={styles.mobileMeta}>
              <span>{formatProductCount(category.productCount)}</span>
            </div>
            <CategoryActions
              category={category}
              onDelete={onDelete}
              onEdit={onEdit}
              onToggle={onToggle}
              permissions={permissions}
              togglingId={togglingId}
            />
          </div>
        </article>
      ))}
    </div>
  );
}

function getInitialFilters() {
  if (typeof window === 'undefined') return DEFAULT_FILTERS;
  return parseFiltersFromHash(window.location.hash);
}

export default function CategoriesPage() {
  // eslint-disable-next-line no-unused-vars -- This ESLint setup does not count JSX member expressions as usage.
  const Ui = {
    AdminThemeScope,
    Badge,
    Button,
    Input,
    ListPagination,
    ListSurface,
    ListSurfaceFooter,
    ListSurfaceHeader,
    Select,
    StateBlock,
    TableScroll,
    TableShell,
    TableToolbar,
    IconAction,
  };
  // eslint-disable-next-line no-unused-vars -- This ESLint setup does not count JSX member expressions as usage.
  const View = {
    CategoriesCards,
    CategoriesTable,
    CategoryActions,
    CategoryDeleteDialog,
    CategoryForm,
    CategoryImage,
    StatusBadge,
  };
  const [filters, setFilters] = useState(getInitialFilters);
  const [draftFilters, setDraftFilters] = useState(getInitialFilters);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 10, total: 0, pageCount: 1 });
  const [status, setStatus] = useState(VIEW_STATUS.loading);
  const [errorMessage, setErrorMessage] = useState('');
  const [formState, setFormState] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const permissions = useMemo(
    () => ({
      canRead: canRead('categories'),
      canWrite: canWrite('categories'),
      canUpdate: canUpdate('categories'),
      canDelete: canDelete('categories'),
    }),
    [],
  );

  const syncFilters = useCallback((partial) => {
    setDraftFilters((current) => normalizeFilters({ ...current, ...partial }));
    setFilters((current) => normalizeFilters({ ...current, ...partial }));
  }, []);

  const loadCategories = useCallback(async () => {
    setStatus(VIEW_STATUS.loading);
    setErrorMessage('');

    try {
      const response = await categoriesApi.list(buildCategoriesQuery(filters));

      if (!response?.ok) {
        throw new Error('No se pudieron cargar las categorias.');
      }

      const payload = normalizeCategoriesResponse(response);
      setItems(payload.items);
      setMeta(payload.meta);
      setStatus(payload.items.length > 0 ? VIEW_STATUS.success : VIEW_STATUS.empty);
    } catch (error) {
      setItems([]);
      setStatus(VIEW_STATUS.error);
      setErrorMessage(error?.message || 'No se pudieron cargar las categorias.');
    }
  }, [filters]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const targetHash = serializeFiltersToHash(filters);
    if (window.location.hash !== targetHash) {
      window.history.replaceState(null, '', targetHash);
    }
  }, [filters]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  function handleSubmit(event) {
    event.preventDefault();
    setFilters(normalizeFilters({ ...draftFilters, page: 1 }));
  }

  function handleClear() {
    setDraftFilters(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
  }

  function handlePage(nextPage) {
    syncFilters({ page: nextPage });
  }

  function handleCreate() {
    setFormState({ category: null, mode: 'create' });
  }

  function handleEdit(category) {
    setFormState({ category, mode: 'edit' });
  }

  function handleDelete(category) {
    setDeleteTarget(category);
  }

  async function handleToggle(category) {
    setTogglingId(category.id);
    try {
      const response = await categoriesApi.toggleActive(category.id, !category.active);
      if (!response?.ok) {
        throw new Error('No se pudo actualizar el estado.');
      }
      await loadCategories();
    } catch (error) {
      setErrorMessage(error?.message || 'No se pudo actualizar el estado.');
      setStatus(VIEW_STATUS.error);
    } finally {
      setTogglingId(null);
    }
  }

  function handleCategorySaved({ mode }) {
    setFormState(null);
    if (mode === 'create' && filters.page !== 1) {
      syncFilters({ page: 1 });
      return;
    }
    void loadCategories();
  }

  function handleCategoryDeleted() {
    setDeleteTarget(null);
    const page = Number(meta.page) || 1;
    if (items.length <= 1 && page > 1) {
      syncFilters({ page: page - 1 });
      return;
    }
    void loadCategories();
  }

  const hasData = status === VIEW_STATUS.success;
  const page = Number(meta.page) || 1;
  const pageCount = Math.max(1, Number(meta.pageCount) || 1);
  const resultFrom = meta.total > 0 ? (page - 1) * meta.pageSize + 1 : 0;
  const resultTo = Math.min(meta.total, page * meta.pageSize);

  return (
    <AdminThemeScope>
      <ListSurface>
        <ListSurfaceHeader
          action={
            permissions.canWrite ? (
              <Button onClick={handleCreate} variant="primary">
                Nueva categoria
              </Button>
            ) : null
          }
          description="Administra las categorias que organizan el catalogo y facilitan la navegacion de los clientes."
          eyebrow="Catalogo"
          title="Categorias"
        />

        <TableShell>
          <TableToolbar className={styles.toolbar}>
            <form className={styles.filters} onSubmit={handleSubmit}>
              <Input
                id="categories-filter-q"
                label="Buscar"
                onChange={(event) =>
                  setDraftFilters((current) => ({ ...current, q: event.target.value }))
                }
                placeholder="Buscar por nombre"
                type="search"
                value={draftFilters.q}
              />
              <Select
                id="categories-filter-status"
                label="Estado"
                onChange={(event) => syncFilters({ status: event.target.value, page: 1 })}
                value={filters.status}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <Select
                id="categories-filter-order-by"
                label="Ordenar por"
                onChange={(event) => syncFilters({ orderBy: event.target.value, page: 1 })}
                value={filters.orderBy}
              >
                {ORDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <Select
                id="categories-filter-order-dir"
                label="Direccion"
                onChange={(event) => syncFilters({ orderDir: event.target.value, page: 1 })}
                value={filters.orderDir}
              >
                {ORDER_DIRECTION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <Select
                id="categories-filter-page-size"
                label="Por pagina"
                onChange={(event) => syncFilters({ pageSize: event.target.value, page: 1 })}
                value={filters.pageSize}
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
              <div className={styles.filterActions}>
                <Button type="submit" variant="primary">
                  Buscar
                </Button>
                <Button onClick={handleClear} variant="ghost">
                  Limpiar
                </Button>
              </div>
            </form>
          </TableToolbar>

          {status === VIEW_STATUS.loading ? (
            <StateBlock
              description="Consultando categorias."
              status="loading"
              title="Cargando categorias"
            />
          ) : null}

          {status === VIEW_STATUS.error ? (
            <StateBlock
              action={
                <Button onClick={() => void loadCategories()} variant="primary">
                  Reintentar
                </Button>
              }
              description={errorMessage}
              status="error"
              title="No pudimos cargar las categorias"
            />
          ) : null}

          {status === VIEW_STATUS.empty ? (
            <StateBlock
              action={
                permissions.canWrite ? (
                  <Button onClick={handleCreate} variant="secondary">
                    Crear categoria
                  </Button>
                ) : (
                  <Button onClick={handleClear} variant="secondary">
                    Limpiar filtros
                  </Button>
                )
              }
              description="No hay categorias para los filtros seleccionados."
              status="empty"
              title="Sin resultados"
            />
          ) : null}

          {hasData ? (
            <>
              <CategoriesTable
                items={items}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onToggle={handleToggle}
                permissions={permissions}
                togglingId={togglingId}
              />
              <CategoriesCards
                items={items}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onToggle={handleToggle}
                permissions={permissions}
                togglingId={togglingId}
              />
            </>
          ) : null}
        </TableShell>

        <ListSurfaceFooter
          meta={
            meta.total > 0
              ? `${resultFrom}-${resultTo} de ${meta.total} categorias`
              : 'Sin resultados'
          }
          metaId="categories-meta"
        >
          <ListPagination label="Paginacion de categorias">
            <Button disabled={page <= 1} onClick={() => handlePage(1)} size="sm" variant="ghost">
              Primero
            </Button>
            <Button
              disabled={page <= 1}
              onClick={() => handlePage(page - 1)}
              size="sm"
              variant="ghost"
            >
              Anterior
            </Button>
            {Array.from({ length: pageCount }, (_, index) => index + 1)
              .slice(Math.max(0, page - 3), Math.max(0, page - 3) + 5)
              .map((currentPage) => (
                <Button
                  aria-current={currentPage === page ? 'page' : undefined}
                  key={currentPage}
                  onClick={() => handlePage(currentPage)}
                  size="sm"
                  variant={currentPage === page ? 'primary' : 'ghost'}
                >
                  {currentPage}
                </Button>
              ))}
            <Button
              disabled={page >= pageCount}
              onClick={() => handlePage(page + 1)}
              size="sm"
              variant="ghost"
            >
              Siguiente
            </Button>
            <Button
              disabled={page >= pageCount}
              onClick={() => handlePage(pageCount)}
              size="sm"
              variant="ghost"
            >
              Ultimo
            </Button>
          </ListPagination>
        </ListSurfaceFooter>
      </ListSurface>

      <CategoryForm
        category={formState?.category}
        mode={formState?.mode || 'create'}
        onClose={() => setFormState(null)}
        onSaved={handleCategorySaved}
        open={Boolean(formState)}
      />
      <CategoryDeleteDialog
        category={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={handleCategoryDeleted}
        open={Boolean(deleteTarget)}
      />
    </AdminThemeScope>
  );
}
