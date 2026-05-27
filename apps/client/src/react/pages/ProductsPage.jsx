import { useMemo, useState } from 'react';
import { addToCart, getCart, updateQuantity } from '/src/utils/cartService.js';
import { showSnackbar } from '/src/utils/showSnackbar.js';
import { getDiscountedPrice } from '/src/utils/helpers.js';
import { fetchPublicCategories, fetchPublicProducts } from '../services/publicApi.js';
import { useAsyncResource } from '../hooks/useAsyncResource.jsx';
import { AsyncStateNotice } from '../components/AsyncStateNotice.jsx';
import { ProductCard } from '../components/ProductCard.jsx';
import '/src/styles/products.css';

function normalizeCategories(categories = []) {
  return categories
    .filter((category) => category && category.id != null)
    .map((category) => ({
      id: category.id,
      name: category.name || 'Category',
      isActive: category.isActive !== false,
    }));
}

function normalizeProducts(products = [], categories = []) {
  const categoryById = new Map(categories.map((category) => [String(category.id), category.name]));

  return products.map((product) => {
    const discount = Number(product?.offer?.discountPercent || 0);
    const price = Number(product?.price || 0);
    const finalPrice = discount > 0 ? getDiscountedPrice(price, discount) : price;

    return {
      id: product?.id,
      name: product?.name || 'Product',
      description: product?.description || '',
      imageUrl: product?.imageUrl || '/img/hero1.png',
      categoryId: product?.categoryId,
      categoryName: categoryById.get(String(product?.categoryId)) || 'Uncategorized',
      originalPrice: price,
      finalPrice,
      discountPercent: discount,
      source: 'products',
      searchText: `${product?.name || ''} ${product?.description || ''}`.toLowerCase(),
    };
  });
}

function filterProducts(products, selectedCategoryId, query) {
  const normalizedQuery = String(query || '')
    .trim()
    .toLowerCase();

  return products.filter((product) => {
    if (selectedCategoryId !== 'all' && String(product.categoryId) !== String(selectedCategoryId)) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return (
      product.searchText.includes(normalizedQuery) ||
      String(product.categoryName || '')
        .toLowerCase()
        .includes(normalizedQuery)
    );
  });
}

export function ProductsPage() {
  const [query, setQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');

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

  const visibleProducts = useMemo(() => {
    return filterProducts(products, selectedCategoryId, query);
  }, [products, selectedCategoryId, query]);

  const handleAddToCart = (product) => {
    const existingQuantity =
      getCart().find((item) => item.id === String(product.id))?.quantity || 0;
    addToCart(product);
    if (product.quantity > 1) {
      updateQuantity(product.id, existingQuantity + product.quantity);
    }
    showSnackbar(`Added to cart: ${product.name}`);
  };

  const hasCatalogError = catalogResource.status === 'error';
  const isLoadingCatalog = catalogResource.status === 'loading';
  const isCatalogReady = catalogResource.status === 'success';

  return (
    <main className="products" aria-labelledby="products-title">
      <header className="products__header">
        <h1 id="products-title" className="products__title">
          Our menu
        </h1>
        <p className="products__subtitle">Find your favorites by category or search by name.</p>

        <div className="products__controls">
          <label className="products__control" htmlFor="search-input">
            <span className="visually-hidden">Search products</span>
            <input
              id="search-input"
              className="products__search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products"
              inputMode="search"
            />
          </label>
        </div>
      </header>

      {isLoadingCatalog ? (
        <AsyncStateNotice message="Loading catalog…" className="products__state" />
      ) : null}

      {hasCatalogError ? (
        <AsyncStateNotice
          state="error"
          message={`We could not load the catalog. ${catalogResource.error?.message || 'Please try again.'}`}
          className="products__state"
        />
      ) : null}

      {isCatalogReady ? (
        <>
          <nav className="products__categories" aria-label="Product categories">
            <ul className="products__category-list">
              <li>
                <button
                  type="button"
                  className={`products__category-btn ${selectedCategoryId === 'all' ? 'is-active' : ''}`}
                  onClick={() => setSelectedCategoryId('all')}
                  aria-pressed={selectedCategoryId === 'all'}
                >
                  All
                </button>
              </li>

              {categories.map((category) => (
                <li key={category.id}>
                  <button
                    type="button"
                    className={`products__category-btn ${String(selectedCategoryId) === String(category.id) ? 'is-active' : ''}`}
                    onClick={() => setSelectedCategoryId(category.id)}
                    aria-pressed={String(selectedCategoryId) === String(category.id)}
                  >
                    {category.name}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {products.length === 0 ? (
            <AsyncStateNotice
              message="There are no products available right now."
              className="products__state"
            />
          ) : null}

          {products.length > 0 && visibleProducts.length === 0 ? (
            <AsyncStateNotice
              message="No products match your current filters."
              className="products__state"
            />
          ) : null}

          {visibleProducts.length > 0 ? (
            <section className="products__grid" id="products-grid" aria-label="Products catalog">
              {visibleProducts.map((product) => (
                <ProductCard
                  key={product.id || `${product.name}-${product.categoryId}`}
                  product={product}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </section>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
