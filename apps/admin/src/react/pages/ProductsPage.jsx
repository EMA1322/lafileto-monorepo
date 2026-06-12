import { useCallback, useEffect, useMemo, useState } from 'react';
import { productsApi, categoriesApi } from '@/utils/apis.js';
import { canDelete, canRead, canUpdate, canWrite } from '@/utils/rbac.js';
import {
  AdminThemeScope,
  Badge,
  Button,
  Input,
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

  return (
    <span className={styles.offerStack}>
      <Badge variant="danger">
        {product.offer.discountPercent > 0
          ? `-${Math.round(product.offer.discountPercent)}%`
          : 'Oferta'}
      </Badge>
      <span>{formatMoney(product.offer.finalPrice)}</span>
    </span>
  );
}

function ProductActions({ permissions }) {
  if (
    !permissions.canRead &&
    !permissions.canWrite &&
    !permissions.canUpdate &&
    !permissions.canDelete
  ) {
    return <span className={styles.muted}>Sin acciones</span>;
  }

  return (
    <div className={styles.actions} aria-label="Acciones de producto">
      {permissions.canRead ? (
        <Button disabled size="sm" variant="ghost" title="Proxima fase">
          Ver
        </Button>
      ) : null}
      {permissions.canUpdate ? (
        <Button disabled size="sm" variant="ghost" title="Proxima fase">
          Editar
        </Button>
      ) : null}
      {permissions.canDelete ? (
        <Button disabled size="sm" variant="danger" title="Proxima fase">
          Eliminar
        </Button>
      ) : null}
    </div>
  );
}

function ProductsTable({ categoriesById, items, permissions }) {
  return (
    <TableScroll className={styles.tableScroll}>
      <table aria-describedby="products-meta" className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Producto</th>
            <th scope="col">Precio</th>
            <th scope="col">Stock</th>
            <th scope="col">Estado</th>
            <th scope="col">Categoria</th>
            <th scope="col">Oferta</th>
            <th scope="col">Actualizado</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map((product) => (
            <tr key={product.id}>
              <td>
                <div className={styles.productCell}>
                  <ProductImage product={product} />
                  <div>
                    <strong>{product.name}</strong>
                    <span>{product.description || 'Sin descripcion'}</span>
                  </div>
                </div>
              </td>
              <td>{formatMoney(product.price)}</td>
              <td>{product.stock}</td>
              <td>
                <StatusBadge status={product.status} />
              </td>
              <td>
                {categoriesById.get(String(product.categoryId)) ||
                  product.categoryName ||
                  'Sin categoria'}
              </td>
              <td>
                <OfferBadge product={product} />
              </td>
              <td>{formatDateTime(product.updatedAt)}</td>
              <td>
                <ProductActions permissions={permissions} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroll>
  );
}

function ProductsCards({ categoriesById, items, permissions }) {
  return (
    <div className={styles.mobileList}>
      {items.map((product) => (
        <article className={styles.mobileItem} key={product.id}>
          <ProductImage product={product} />
          <div className={styles.mobileBody}>
            <div className={styles.mobileHeader}>
              <h2>{product.name}</h2>
              <StatusBadge status={product.status} />
            </div>
            <p>
              {categoriesById.get(String(product.categoryId)) ||
                product.categoryName ||
                'Sin categoria'}
            </p>
            <div className={styles.mobileMeta}>
              <span>{formatMoney(product.price)}</span>
              <span>Stock {product.stock}</span>
            </div>
            <OfferBadge product={product} />
            <ProductActions permissions={permissions} />
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

export default function ProductsPage() {
  // eslint-disable-next-line no-unused-vars -- This ESLint setup does not count JSX member expressions as usage.
  const Ui = {
    AdminThemeScope,
    Badge,
    Button,
    Input,
    Select,
    StateBlock,
    TableScroll,
    TableShell,
    TableToolbar,
  };
  // eslint-disable-next-line no-unused-vars -- This ESLint setup does not count JSX member expressions as usage.
  const View = {
    ProductActions,
    ProductImage,
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

  const permissions = useMemo(
    () => ({
      canRead: canRead('products'),
      canWrite: canWrite('products'),
      canUpdate: canUpdate('products'),
      canDelete: canDelete('products'),
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
      const [productsResponse, categoriesResponse] = await Promise.all([
        productsApi.list(buildProductsQuery(filters)),
        categoriesApi.listAll({ all: 1, pageSize: 100 }),
      ]);

      if (!productsResponse?.ok) {
        throw new Error('No se pudieron cargar los productos.');
      }

      const productsPayload = normalizeProductsResponse(productsResponse);
      setItems(productsPayload.items);
      setMeta(productsPayload.meta);
      setCategories(normalizeCategoriesResponse(categoriesResponse));
      setStatus(productsPayload.items.length > 0 ? VIEW_STATUS.success : VIEW_STATUS.empty);
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

  const hasData = status === VIEW_STATUS.success;
  const page = Number(meta.page) || 1;
  const pageCount = Math.max(1, Number(meta.pageCount) || 1);
  const resultFrom = meta.total > 0 ? (page - 1) * meta.pageSize + 1 : 0;
  const resultTo = Math.min(meta.total, page * meta.pageSize);

  return (
    <AdminThemeScope className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Catalogo</p>
          <h1>Productos</h1>
          <p>Listado operativo con datos reales, filtros y paginacion.</p>
        </div>
        {permissions.canWrite ? (
          <Button disabled title="Proxima fase" variant="primary">
            Crear producto
          </Button>
        ) : null}
      </header>

      <TableShell>
        <TableToolbar>
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
              permissions={permissions}
            />
            <ProductsCards
              categoriesById={categoriesById}
              items={items}
              permissions={permissions}
            />
          </>
        ) : null}
      </TableShell>

      <footer className={styles.footer}>
        <p id="products-meta" aria-live="polite">
          {meta.total > 0
            ? `${resultFrom}-${resultTo} de ${meta.total} productos`
            : 'Sin resultados'}
        </p>
        <nav aria-label="Paginacion de productos" className={styles.pagination}>
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
        </nav>
      </footer>
    </AdminThemeScope>
  );
}
