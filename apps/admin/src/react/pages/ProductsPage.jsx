import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { productsApi, categoriesApi } from '@/utils/apis.js';
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
import {
  DEFAULT_FILTERS,
  PAGE_SIZE_OPTIONS,
  buildProductsQuery,
  formatDateTime,
  formatMoney,
  normalizeCategoriesResponse,
  normalizeFilters,
  normalizeProductsResponse,
  parseFiltersFromHash,
  serializeFiltersToHash,
} from '../products/productsList.helpers.js';
import ProductDeleteDialog from '../products/ProductDeleteDialog.jsx';
import ProductForm from '../products/ProductForm.jsx';
import ProductOfferDeleteDialog from '../products/ProductOfferDeleteDialog.jsx';
import ProductOfferForm from '../products/ProductOfferForm.jsx';
import useDialogFocusTrap from '../hooks/useDialogFocusTrap.js';
import styles from './ProductsPage.module.css';

const VIEW_STATUS = {
  loading: 'loading',
  error: 'error',
  empty: 'empty',
  success: 'success',
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
];

const OFFER_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'true', label: 'En oferta' },
  { value: 'false', label: 'Sin oferta' },
];

const ORDER_OPTIONS = [
  { value: 'updatedAt', label: 'Ultima actualizacion' },
  { value: 'name', label: 'Nombre' },
  { value: 'price', label: 'Precio' },
];

const ORDER_DIRECTION_OPTIONS = [
  { value: 'desc', label: 'Descendente' },
  { value: 'asc', label: 'Ascendente' },
];

function ProductImage({ product }) {
  if (product.imageUrl) {
    return (
      <img
        alt={`Imagen de ${product.name}`}
        className={styles.productImage}
        decoding="async"
        loading="lazy"
        src={product.imageUrl}
      />
    );
  }

  return (
    <span className={styles.productPlaceholder} aria-hidden="true">
      Sin imagen
    </span>
  );
}

function getCategoryLabel(product, categoriesById) {
  return categoriesById.get(String(product.categoryId)) || product.categoryName || 'Sin categoria';
}

function getProductAlerts(product) {
  const pricePending = Number(product.price) <= 0;
  const withoutStock = Number(product.stock) <= 0;
  const alerts = [];

  if (pricePending) alerts.push('Precio pendiente');
  if (withoutStock) alerts.push('Sin stock');
  if (pricePending || withoutStock) alerts.push('No publicable');

  return alerts;
}

function StatusBadge({ status }) {
  const isActive = status === 'active';
  return (
    <Badge variant={isActive ? 'success' : 'warning'}>{isActive ? 'Activo' : 'Inactivo'}</Badge>
  );
}

function OfferBadge({ product }) {
  if (!product.offer) {
    return <Badge variant="neutral">Sin oferta</Badge>;
  }

  const hasFinalPrice = Number.isFinite(Number(product.offer.finalPrice));

  return (
    <span className={styles.offerStack}>
      <Badge variant="danger">
        {product.offer.discountPercent > 0
          ? `-${Math.round(product.offer.discountPercent)}%`
          : 'Oferta'}
      </Badge>
      {hasFinalPrice ? <span>{formatMoney(product.offer.finalPrice)}</span> : null}
    </span>
  );
}

function ProductActions({
  onDelete,
  onEdit,
  onOfferCreate,
  onOfferDelete,
  onOfferEdit,
  onView,
  permissions,
  product,
}) {
  const hasOffer = Boolean(product.offer);
  const canCreateOffer = !hasOffer && permissions.canWriteOffer;
  const canEditOffer = hasOffer && permissions.canUpdateOffer;
  const canDeleteOffer = hasOffer && permissions.canDeleteOffer;
  const hasProductActions = permissions.canRead || permissions.canUpdate || permissions.canDelete;
  const hasHiddenOfferActions = canCreateOffer || canEditOffer || canDeleteOffer;
  void hasHiddenOfferActions;
  void onOfferCreate;
  void onOfferDelete;
  void onOfferEdit;

  if (!hasProductActions) {
    return <span className={styles.muted}>Sin acciones</span>;
  }

  return (
    <div className={styles.actions} aria-label="Acciones de producto">
      {permissions.canRead ? (
        <IconAction
          icon={<Eye />}
          label={`Ver producto: ${product.name}`}
          onClick={() => onView(product)}
        />
      ) : null}
      {permissions.canUpdate ? (
        <IconAction
          icon={<Pencil />}
          label={`Editar producto: ${product.name}`}
          onClick={() => onEdit(product)}
        />
      ) : null}
      {permissions.canDelete ? (
        <IconAction
          className={styles.deleteAction}
          icon={<Trash2 />}
          label={`Eliminar producto: ${product.name}`}
          onClick={() => onDelete(product)}
        />
      ) : null}
    </div>
  );
}

function ProductsTable({
  categoriesById,
  items,
  onDelete,
  onEdit,
  onOfferCreate,
  onOfferDelete,
  onOfferEdit,
  onView,
  permissions,
}) {
  return (
    <TableScroll className={styles.tableScroll}>
      <table aria-describedby="products-meta" className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Producto</th>
            <th scope="col">Precio</th>
            <th scope="col">Stock</th>
            <th scope="col">Estado</th>
            <th scope="col">Oferta</th>
            <th scope="col">Actualizado</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map((product) => {
            const categoryLabel = getCategoryLabel(product, categoriesById);
            const alerts = getProductAlerts(product);

            return (
              <tr key={product.id}>
                <td>
                  <div className={styles.productCell}>
                    <ProductImage product={product} />
                    <div className={styles.productSummary}>
                      <strong>{product.name}</strong>
                      <span className={styles.productCategory}>{categoryLabel}</span>
                      <span className={styles.productDescription}>
                        {product.description || 'Sin descripcion'}
                      </span>
                      {alerts.length > 0 ? (
                        <span className={styles.alertGroup} aria-label="Alertas de publicacion">
                          {alerts.map((alert) => (
                            <span className={styles.infoAlert} key={alert}>
                              {alert}
                            </span>
                          ))}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className={styles.numericCell}>{formatMoney(product.price)}</td>
                <td className={styles.numericCell}>{product.stock}</td>
                <td>
                  <StatusBadge status={product.status} />
                </td>
                <td>
                  <OfferBadge product={product} />
                </td>
                <td className={styles.secondaryCell}>{formatDateTime(product.updatedAt)}</td>
                <td>
                  <ProductActions
                    onDelete={onDelete}
                    onEdit={onEdit}
                    onOfferCreate={onOfferCreate}
                    onOfferDelete={onOfferDelete}
                    onOfferEdit={onOfferEdit}
                    onView={onView}
                    permissions={permissions}
                    product={product}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </TableScroll>
  );
}

function ProductsCards({
  categoriesById,
  items,
  onDelete,
  onEdit,
  onOfferCreate,
  onOfferDelete,
  onOfferEdit,
  onView,
  permissions,
}) {
  return (
    <div className={styles.mobileList}>
      {items.map((product) => {
        const categoryLabel = getCategoryLabel(product, categoriesById);
        const alerts = getProductAlerts(product);

        return (
          <article className={styles.mobileItem} key={product.id}>
            <ProductImage product={product} />
            <div className={styles.mobileBody}>
              <div className={styles.mobileHeader}>
                <div>
                  <h2>{product.name}</h2>
                  <p>{categoryLabel}</p>
                </div>
                <StatusBadge status={product.status} />
              </div>
              <p className={styles.mobileDescription}>{product.description || 'Sin descripcion'}</p>
              <div className={styles.mobileMeta}>
                <span>{formatMoney(product.price)}</span>
                <span>Stock {product.stock}</span>
              </div>
              {alerts.length > 0 ? (
                <div className={styles.alertGroup} aria-label="Alertas de publicacion">
                  {alerts.map((alert) => (
                    <span className={styles.infoAlert} key={alert}>
                      {alert}
                    </span>
                  ))}
                </div>
              ) : null}
              <OfferBadge product={product} />
              <ProductActions
                onDelete={onDelete}
                onEdit={onEdit}
                onOfferCreate={onOfferCreate}
                onOfferDelete={onOfferDelete}
                onOfferEdit={onOfferEdit}
                onView={onView}
                permissions={permissions}
                product={product}
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}

function ProductViewDialog({ categoryLabel = '', onClose, open = false, product = null }) {
  const dialogRef = useRef(null);

  useDialogFocusTrap({
    containerRef: dialogRef,
    initialFocus: '#product-view-close',
    onClose,
    open,
  });

  if (!open || !product) return null;

  function handleOverlayMouseDown(event) {
    if (event.target === event.currentTarget) {
      onClose?.();
    }
  }

  return (
    <div className={styles.viewOverlay} onMouseDown={handleOverlayMouseDown}>
      <section
        aria-labelledby="product-view-title"
        aria-modal="true"
        className={styles.viewDialog}
        ref={dialogRef}
        role="dialog"
      >
        <header className={styles.viewHeader}>
          <div className={styles.viewTitleGroup}>
            <p className={styles.viewEyebrow}>Producto</p>
            <h2 className={styles.viewTitle} id="product-view-title">
              {product.name}
            </h2>
          </div>
          <button
            aria-label="Cerrar detalle"
            className={styles.viewCloseButton}
            id="product-view-close"
            onClick={onClose}
            type="button"
          >
            x
          </button>
        </header>

        <div className={styles.viewBody}>
          <div className={styles.viewMedia}>
            <ProductImage product={product} />
          </div>

          <dl className={styles.viewDetails}>
            <div>
              <dt>Nombre</dt>
              <dd>{product.name}</dd>
            </div>
            <div>
              <dt>Categoria</dt>
              <dd>{categoryLabel || 'Sin categoria'}</dd>
            </div>
            <div className={styles.viewWide}>
              <dt>Descripcion</dt>
              <dd>{product.description || 'Sin descripcion'}</dd>
            </div>
            <div>
              <dt>Precio</dt>
              <dd>{formatMoney(product.price)}</dd>
            </div>
            <div>
              <dt>Stock</dt>
              <dd>{product.stock}</dd>
            </div>
            <div>
              <dt>Publicacion</dt>
              <dd>
                <StatusBadge status={product.status} />
              </dd>
            </div>
            {product.offer ? (
              <div>
                <dt>Oferta</dt>
                <dd>
                  <OfferBadge product={product} />
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      </section>
    </div>
  );
}

function getInitialFilters() {
  if (typeof window === 'undefined') return DEFAULT_FILTERS;
  return parseFiltersFromHash(window.location.hash);
}

export default function ProductsPage() {
  // eslint-disable-next-line no-unused-vars -- This ESLint setup does not count JSX member expressions as usage.
  const Ui = {
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
  };
  // eslint-disable-next-line no-unused-vars -- This ESLint setup does not count JSX member expressions as usage.
  const View = {
    ProductActions,
    ProductDeleteDialog,
    ProductForm,
    ProductImage,
    ProductOfferDeleteDialog,
    ProductOfferForm,
    ProductViewDialog,
    ProductsCards,
    ProductsTable,
    OfferBadge,
    StatusBadge,
  };
  const [filters, setFilters] = useState(getInitialFilters);
  const [draftFilters, setDraftFilters] = useState(getInitialFilters);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 10, total: 0, pageCount: 1 });
  const [status, setStatus] = useState(VIEW_STATUS.loading);
  const [errorMessage, setErrorMessage] = useState('');
  const [formState, setFormState] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [offerFormState, setOfferFormState] = useState(null);
  const [offerDeleteTarget, setOfferDeleteTarget] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);

  const permissions = useMemo(
    () => ({
      canRead: canRead('products'),
      canWrite: canWrite('products'),
      canUpdate: canUpdate('products'),
      canDelete: canDelete('products'),
      canWriteOffer: canWrite('offers'),
      canUpdateOffer: canUpdate('offers'),
      canDeleteOffer: canDelete('offers'),
    }),
    [],
  );

  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [String(category.id), category.name])),
    [categories],
  );

  const syncFilters = useCallback((partial) => {
    setDraftFilters((current) => normalizeFilters({ ...current, ...partial }));
    setFilters((current) => normalizeFilters({ ...current, ...partial }));
  }, []);

  const loadProducts = useCallback(async () => {
    setStatus(VIEW_STATUS.loading);
    setErrorMessage('');

    try {
      const productsResponse = await productsApi.list(buildProductsQuery(filters));

      if (!productsResponse?.ok) {
        throw new Error('No se pudieron cargar los productos.');
      }

      const productsPayload = normalizeProductsResponse(productsResponse);
      setItems(productsPayload.items);
      setMeta(productsPayload.meta);
      setStatus(productsPayload.items.length > 0 ? VIEW_STATUS.success : VIEW_STATUS.empty);

      try {
        const categoriesResponse = await categoriesApi.listAll({ all: 1, pageSize: 100 });
        setCategories(normalizeCategoriesResponse(categoriesResponse));
      } catch {
        setCategories([]);
      }
    } catch (error) {
      setItems([]);
      setStatus(VIEW_STATUS.error);
      setErrorMessage(error?.message || 'No se pudieron cargar los productos.');
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
    void loadProducts();
  }, [loadProducts]);

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
    setFormState({ mode: 'create', product: null });
  }

  function handleEdit(product) {
    setFormState({ mode: 'edit', product });
  }

  function handleDelete(product) {
    setDeleteTarget(product);
  }

  function handleOfferCreate(product) {
    setOfferFormState({ mode: 'create', product });
  }

  function handleOfferEdit(product) {
    setOfferFormState({ mode: 'edit', product });
  }

  function handleOfferDelete(product) {
    setOfferDeleteTarget(product);
  }

  function handleView(product) {
    setViewTarget(product);
  }

  function handleProductSaved({ mode }) {
    setFormState(null);
    if (mode === 'create' && filters.page !== 1) {
      syncFilters({ page: 1 });
      return;
    }
    void loadProducts();
  }

  function handleProductDeleted() {
    setDeleteTarget(null);
    if (items.length <= 1 && page > 1) {
      syncFilters({ page: page - 1 });
      return;
    }
    void loadProducts();
  }

  function handleOfferSaved() {
    setOfferFormState(null);
    void loadProducts();
  }

  function handleOfferDeleted() {
    setOfferDeleteTarget(null);
    void loadProducts();
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
                Crear producto
              </Button>
            ) : null
          }
          description="Administra el catalogo, disponibilidad y datos de publicacion de cada producto."
          eyebrow="Catalogo"
          title="Productos"
        />

        <TableShell>
          <TableToolbar className={styles.toolbar}>
            <form className={styles.filters} onSubmit={handleSubmit}>
              <Input
                id="products-filter-q"
                label="Buscar"
                onChange={(event) =>
                  setDraftFilters((current) => ({ ...current, q: event.target.value }))
                }
                placeholder="Buscar por nombre"
                type="search"
                value={draftFilters.q}
              />
              <Select
                id="products-filter-category"
                label="Categoria"
                onChange={(event) => syncFilters({ categoryId: event.target.value, page: 1 })}
                value={filters.categoryId}
              >
                <option value="all">Todas las categorias</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
              <Select
                id="products-filter-status"
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
                id="products-filter-offer"
                label="Oferta"
                onChange={(event) => syncFilters({ hasOffer: event.target.value, page: 1 })}
                value={filters.hasOffer}
              >
                {OFFER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <Select
                id="products-filter-order-by"
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
                id="products-filter-order-dir"
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
                id="products-filter-page-size"
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
              description="Consultando el catalogo."
              status="loading"
              title="Cargando productos"
            />
          ) : null}

          {status === VIEW_STATUS.error ? (
            <StateBlock
              action={
                <Button onClick={() => void loadProducts()} variant="primary">
                  Reintentar
                </Button>
              }
              description={errorMessage}
              status="error"
              title="No pudimos cargar los productos"
            />
          ) : null}

          {status === VIEW_STATUS.empty ? (
            <StateBlock
              action={
                <Button onClick={handleClear} variant="secondary">
                  Limpiar filtros
                </Button>
              }
              description="No hay productos para los filtros seleccionados."
              status="empty"
              title="Sin resultados"
            />
          ) : null}

          {hasData ? (
            <>
              <ProductsTable
                categoriesById={categoriesById}
                items={items}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onOfferCreate={handleOfferCreate}
                onOfferDelete={handleOfferDelete}
                onOfferEdit={handleOfferEdit}
                onView={handleView}
                permissions={permissions}
              />
              <ProductsCards
                categoriesById={categoriesById}
                items={items}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onOfferCreate={handleOfferCreate}
                onOfferDelete={handleOfferDelete}
                onOfferEdit={handleOfferEdit}
                onView={handleView}
                permissions={permissions}
              />
            </>
          ) : null}
        </TableShell>

        <ListSurfaceFooter
          meta={
            meta.total > 0
              ? `${resultFrom}-${resultTo} de ${meta.total} productos`
              : 'Sin resultados'
          }
          metaId="products-meta"
        >
          <ListPagination label="Paginacion de productos">
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

      <ProductForm
        categories={categories}
        mode={formState?.mode || 'create'}
        onClose={() => setFormState(null)}
        onSaved={handleProductSaved}
        open={Boolean(formState)}
        product={formState?.product}
      />
      <ProductDeleteDialog
        onClose={() => setDeleteTarget(null)}
        onDeleted={handleProductDeleted}
        open={Boolean(deleteTarget)}
        product={deleteTarget}
      />
      <ProductOfferForm
        mode={offerFormState?.mode || 'create'}
        onClose={() => setOfferFormState(null)}
        onSaved={handleOfferSaved}
        open={Boolean(offerFormState)}
        product={offerFormState?.product}
      />
      <ProductOfferDeleteDialog
        onClose={() => setOfferDeleteTarget(null)}
        onDeleted={handleOfferDeleted}
        open={Boolean(offerDeleteTarget)}
        product={offerDeleteTarget}
      />
      <ProductViewDialog
        categoryLabel={viewTarget ? getCategoryLabel(viewTarget, categoriesById) : ''}
        onClose={() => setViewTarget(null)}
        open={Boolean(viewTarget)}
        product={viewTarget}
      />
    </AdminThemeScope>
  );
}
