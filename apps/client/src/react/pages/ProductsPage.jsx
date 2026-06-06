import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addToCart, getCart, updateQuantity } from '/src/utils/cartService.js';
import { showSnackbar } from '/src/utils/showSnackbar.js';
import { getDiscountedPrice } from '/src/utils/helpers.js';
import { Button } from '/src/components/ui/Button.jsx';
import { SearchInput } from '/src/components/ui/Input.jsx';
import { EmptyState, ErrorState, LoadingState } from '/src/components/ui/State.jsx';
import { fetchPublicCategories, fetchPublicProducts } from '../services/publicApi.js';
import { useAsyncResource } from '../hooks/useAsyncResource.jsx';
import { ProductCard } from '../components/ProductCard.jsx';
import { ProductDetailOverlay } from '../components/ProductDetailOverlay.jsx';
import styles from './ProductsPage.module.css';

const PRODUCTS_PAGE_SIZE = 6;
const ALL_FILTER_ID = 'all';
const OFFER_FILTER_ID = 'offers';

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeCategories(categories = []) {
  return categories
    .filter((category) => category && category.id != null)
    .map((category) => ({
      id: category.id,
      name: category.name || 'Categoría',
      isActive: category.isActive !== false,
    }));
}

function normalizeProducts(products = [], categories = []) {
  const categoryById = new Map(categories.map((category) => [String(category.id), category.name]));

  return products.map((product) => {
    const discount = Number(product?.offer?.discountPercent || 0);
    const price = Number(product?.price || 0);
    const finalPrice = discount > 0 ? getDiscountedPrice(price, discount) : price;
    const categoryName = categoryById.get(String(product?.categoryId)) || 'Sin categoría';

    return {
      id: product?.id,
      name: product?.name || 'Producto',
      description: product?.description || '',
      imageUrl: product?.imageUrl || '/img/hero1.png',
      categoryId: product?.categoryId,
      categoryName,
      originalPrice: price,
      finalPrice,
      discountPercent: discount,
      source: 'products',
      searchText: normalizeSearchText(
        `${product?.name || ''} ${product?.description || ''} ${categoryName}`,
      ),
    };
  });
}

function hasVisibleDiscount(product) {
  return (
    Number(product?.discountPercent || 0) > 0 ||
    Number(product?.originalPrice || 0) > Number(product?.finalPrice || 0)
  );
}

function filterProducts(products, selectedFilterId, query) {
  const normalizedQuery = normalizeSearchText(query);

  return products.filter((product) => {
    if (selectedFilterId === OFFER_FILTER_ID && !hasVisibleDiscount(product)) {
      return false;
    }

    if (
      selectedFilterId !== ALL_FILTER_ID &&
      selectedFilterId !== OFFER_FILTER_ID &&
      String(product.categoryId) !== String(selectedFilterId)
    ) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return product.searchText.includes(normalizedQuery);
  });
}

export function ProductsPage() {
  const [query, setQuery] = useState('');
  const [selectedFilterId, setSelectedFilterId] = useState(ALL_FILTER_ID);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const detailTriggerRef = useRef(null);

  const catalogResource = useAsyncResource(async () => {
    const [categories, products] = await Promise.all([
      fetchPublicCategories(),
      fetchPublicProducts(),
    ]);

    const normalizedCategories = normalizeCategories(categories);
    const normalizedProducts = normalizeProducts(products, normalizedCategories);

    return {
      categories: normalizedCategories,
      products: normalizedProducts,
    };
  }, []);

  const categories = catalogResource.data?.categories || [];
  const products = catalogResource.data?.products || [];
  const categoryIdsWithProducts = useMemo(() => {
    return new Set(products.map((product) => String(product.categoryId)));
  }, [products]);
  const visibleCategories = useMemo(() => {
    return categories.filter(
      (category) => category.isActive && categoryIdsWithProducts.has(String(category.id)),
    );
  }, [categories, categoryIdsWithProducts]);

  useEffect(() => {
    const isBuiltInFilter =
      selectedFilterId === ALL_FILTER_ID || selectedFilterId === OFFER_FILTER_ID;

    if (isBuiltInFilter) {
      return;
    }

    const selectedCategoryIsVisible = visibleCategories.some(
      (category) => String(category.id) === String(selectedFilterId),
    );

    if (!selectedCategoryIsVisible) {
      setSelectedFilterId(ALL_FILTER_ID);
      setCurrentPage(1);
    }
  }, [selectedFilterId, visibleCategories]);

  const visibleProducts = useMemo(() => {
    return filterProducts(products, selectedFilterId, query);
  }, [products, selectedFilterId, query]);

  const totalPages = Math.max(1, Math.ceil(visibleProducts.length / PRODUCTS_PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * PRODUCTS_PAGE_SIZE;
  const pageEndIndex = pageStartIndex + PRODUCTS_PAGE_SIZE;
  const paginatedProducts = visibleProducts.slice(pageStartIndex, pageEndIndex);
  const firstVisibleProductNumber = visibleProducts.length === 0 ? 0 : pageStartIndex + 1;
  const lastVisibleProductNumber = Math.min(pageEndIndex, visibleProducts.length);

  const handleQueryChange = (event) => {
    setQuery(event.target.value);
    setCurrentPage(1);
  };

  const handleFilterSelect = (filterId) => {
    setSelectedFilterId(filterId);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setQuery('');
    setSelectedFilterId(ALL_FILTER_ID);
    setCurrentPage(1);
  };

  const handleOpenDetail = (product, event) => {
    detailTriggerRef.current = event?.currentTarget || null;
    setSelectedProduct(product);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = useCallback(() => {
    setIsDetailOpen(false);
    setSelectedProduct(null);
  }, []);

  const handleAddToCart = (product) => {
    const existingQuantity =
      getCart().find((item) => item.id === String(product.id))?.quantity || 0;
    addToCart(product);
    if (product.quantity > 1) {
      updateQuantity(product.id, existingQuantity + product.quantity);
    }
    showSnackbar(`Agregado al carrito: ${product.name}`);
  };

  const hasCatalogError = catalogResource.status === 'error';
  const isLoadingCatalog = catalogResource.status === 'loading';
  const isCatalogReady = catalogResource.status === 'success';
  const hasActiveFilters = selectedFilterId !== ALL_FILTER_ID || query.trim() !== '';
  const resultsSummary = visibleProducts.length
    ? `Mostrando ${firstVisibleProductNumber}-${lastVisibleProductNumber} de ${visibleProducts.length} productos`
    : '0 productos encontrados';

  return (
    <main className={styles.products} aria-labelledby="products-title">
      <section className={styles.topSection}>
        <header className={styles.header}>
          <div className={styles.heading}>
            <p className={styles.eyebrow}>Menú digital</p>
            <h1 id="products-title" className={styles.title}>
              Nuestro menú
            </h1>
            <span className={styles.ornament} aria-hidden="true" />
            <p className={styles.subtitle}>
              Elegí tus favoritos, filtrá por categoría y armá tu pedido en minutos.
            </p>
          </div>

          <label className={styles.searchLabel} htmlFor="products-search">
            <span className={styles.visuallyHidden}>Buscar productos</span>
            <SearchInput
              id="products-search"
              className={styles.search}
              inputClassName={styles.searchInput}
              aria-label="Buscar productos"
              value={query}
              onChange={handleQueryChange}
              placeholder="Buscar por producto o categoría"
              inputMode="search"
            />
          </label>
        </header>

        {isCatalogReady ? (
          <nav className={styles.categories} aria-label="Categorías de productos">
            <ul className={styles.categoryList}>
              <li style={{ '--chip-index': 0 }}>
                <button
                  type="button"
                  className={`${styles.chip} ${selectedFilterId === ALL_FILTER_ID ? styles.chipActive : ''}`.trim()}
                  onClick={() => handleFilterSelect(ALL_FILTER_ID)}
                  aria-pressed={selectedFilterId === ALL_FILTER_ID}
                >
                  Todos
                </button>
              </li>

              <li style={{ '--chip-index': 1 }}>
                <button
                  type="button"
                  className={`${styles.chip} ${styles.offerChip} ${
                    selectedFilterId === OFFER_FILTER_ID ? styles.chipActive : ''
                  }`.trim()}
                  onClick={() => handleFilterSelect(OFFER_FILTER_ID)}
                  aria-pressed={selectedFilterId === OFFER_FILTER_ID}
                >
                  En oferta
                </button>
              </li>

              {visibleCategories.map((category, index) => (
                <li key={category.id} style={{ '--chip-index': index + 2 }}>
                  <button
                    type="button"
                    className={`${styles.chip} ${
                      String(selectedFilterId) === String(category.id) ? styles.chipActive : ''
                    }`.trim()}
                    onClick={() => handleFilterSelect(category.id)}
                    aria-pressed={String(selectedFilterId) === String(category.id)}
                  >
                    {category.name}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </section>

      {isLoadingCatalog ? (
        <LoadingState
          title="Cargando catálogo"
          message="Estamos preparando el menú para vos."
          className={styles.state}
        />
      ) : null}

      {hasCatalogError ? (
        <ErrorState
          title="No pudimos cargar el catálogo"
          message={catalogResource.error?.message || 'Intentá nuevamente en unos minutos.'}
          className={styles.state}
        />
      ) : null}

      {isCatalogReady ? (
        <section className={styles.catalog} aria-label="Catálogo de productos">
          {products.length > 0 ? (
            <p className={styles.results} role="status" aria-live="polite">
              {resultsSummary}
            </p>
          ) : null}

          {products.length === 0 ? (
            <EmptyState
              title="No hay productos disponibles"
              message="Todavía no hay productos para mostrar en el menú."
              className={styles.state}
            />
          ) : null}

          {products.length > 0 && visibleProducts.length === 0 ? (
            <EmptyState
              title="No encontramos resultados"
              message="Probá con otra búsqueda o categoría."
              className={styles.state}
            >
              {hasActiveFilters ? (
                <Button
                  variant="secondary"
                  className={styles.resetButton}
                  onClick={handleClearFilters}
                >
                  Limpiar filtros
                </Button>
              ) : null}
            </EmptyState>
          ) : null}

          {visibleProducts.length > 0 ? (
            <section className={styles.grid} id="products-grid" aria-label="Productos disponibles">
              {paginatedProducts.map((product, index) => (
                <ProductCard
                  key={product.id || `${product.name}-${product.categoryId}`}
                  className={styles.productCard}
                  articleProps={{ style: { '--card-index': index } }}
                  product={product}
                  onAddToCart={handleAddToCart}
                  onOpenDetail={handleOpenDetail}
                />
              ))}
            </section>
          ) : null}

          {visibleProducts.length > PRODUCTS_PAGE_SIZE ? (
            <nav className={styles.pagination} aria-label="Paginación de productos">
              <Button
                variant="ghost"
                className={styles.paginationButton}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={safeCurrentPage === 1}
                aria-label="Ver página anterior de productos"
              >
                Anterior
              </Button>
              <span className={styles.pageIndicator} aria-live="polite">
                Página {safeCurrentPage} de {totalPages}
              </span>
              <Button
                variant="ghost"
                className={styles.paginationButton}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={safeCurrentPage === totalPages}
                aria-label="Ver página siguiente de productos"
              >
                Siguiente
              </Button>
            </nav>
          ) : null}
        </section>
      ) : null}
      <ProductDetailOverlay
        key={selectedProduct?.id || selectedProduct?.name || 'closed-product-detail'}
        product={selectedProduct}
        isOpen={isDetailOpen}
        onClose={handleCloseDetail}
        onAddToCart={handleAddToCart}
        returnFocusElement={detailTriggerRef.current}
      />
    </main>
  );
}
