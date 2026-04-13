import { useMemo } from 'react';
import {
  fetchBusinessStatus,
  fetchCommercialConfig,
  fetchPublicCategories,
  fetchPublicOffers,
  fetchPublicSettings,
} from '../services/publicApi.js';
import { useAsyncResource } from '../hooks/useAsyncResource.jsx';
import { AsyncStateNotice } from '../components/AsyncStateNotice.jsx';
import { formatPrice, getDiscountedPrice } from '/src/utils/helpers.js';
import { addToCart } from '/src/utils/cartService.js';
import { showSnackbar } from '/src/utils/showSnackbar.js';
import '/src/styles/react-home.css';

function SectionState({ label, status, error, isEmpty, emptyText, children }) {
  if (status === 'loading') {
    return <AsyncStateNotice message={`Loading ${label}…`} className="react-home__state" />;
  }

  if (status === 'error') {
    return (
      <AsyncStateNotice
        state="error"
        message={`We could not load ${label}. ${error?.message || 'Please try again.'}`}
        className="react-home__state"
      />
    );
  }

  if (isEmpty) {
    return <AsyncStateNotice message={emptyText} className="react-home__state" />;
  }

  return children;
}

function resolveHero(settings, commercialConfig) {
  const businessName = settings?.brandName || settings?.businessName || 'La Fileto';
  const title = commercialConfig?.heroTitle || settings?.heroTitle || `Welcome to ${businessName}`;
  const subtitle =
    commercialConfig?.heroSubtitle ||
    settings?.heroSubtitle ||
    'Place your order in minutes and confirm by WhatsApp.';
  const imageUrl =
    commercialConfig?.heroImageUrl || settings?.heroImageUrl || '/img/hero1.png';

  return { title, subtitle, imageUrl, businessName };
}

function resolveBusinessStatus(statusData) {
  const isOpen = statusData?.isOpen === true;
  const label = isOpen ? 'Open now' : 'Closed now';

  const details = [statusData?.message, statusData?.reason, statusData?.nextOpeningTime]
    .filter(Boolean)
    .join(' · ');

  return {
    isOpen,
    label,
    details: details || 'Check Contact for updated service hours.',
  };
}

export function HomePage() {
  const handleAddOfferToCart = (offer) => {
    const product = offer?.product || {};
    const basePrice = Number(product?.price || 0);
    const discount = Number(offer?.discountPercent || 0);
    const finalPrice = getDiscountedPrice(basePrice, discount);

    if (product?.id == null) return;

    addToCart({
      id: String(product.id),
      name: product.name || 'Special offer',
      price: finalPrice,
      image: product.imageUrl || '/img/hero1.png',
      source: 'offers',
      quantity: 1,
    });

    showSnackbar(`Added to cart: ${product.name || 'Special offer'}`);
  };
  const homeResource = useAsyncResource(async () => {
    const [settings, businessStatus, commercialConfig] = await Promise.all([
      fetchPublicSettings(),
      fetchBusinessStatus(),
      fetchCommercialConfig(),
    ]);

    return {
      hero: resolveHero(settings, commercialConfig),
      businessStatus: resolveBusinessStatus(businessStatus),
    };
  }, []);

  const offersResource = useAsyncResource(fetchPublicOffers, []);
  const categoriesResource = useAsyncResource(fetchPublicCategories, []);

  const offers = useMemo(() => {
    if (!Array.isArray(offersResource.data)) return [];
    return offersResource.data.slice(0, 6);
  }, [offersResource.data]);

  const featuredCategories = useMemo(() => {
    if (!Array.isArray(categoriesResource.data)) return [];
    return categoriesResource.data.filter((category) => category?.isActive !== false).slice(0, 8);
  }, [categoriesResource.data]);

  const hero = homeResource.data?.hero || resolveHero({}, {});
  const businessStatus = homeResource.data?.businessStatus || resolveBusinessStatus({});

  return (
    <main className="react-home" aria-label="Public home">
      <section className="react-home__hero" aria-labelledby="react-home-title">
        <div className="react-home__hero-copy">
          <p className="react-home__kicker">Digital ordering</p>
          <h1 id="react-home-title">{hero.title}</h1>
          <p>{hero.subtitle}</p>
          <a className="btn" href="#products">View menu</a>
        </div>
        <figure className="react-home__hero-media">
          <img src={hero.imageUrl} alt={`${hero.businessName} featured dish`} loading="eager" />
        </figure>
      </section>

      <section className="react-home__status" aria-live="polite" aria-label="Business status">
        <h2>Business status</h2>
        <SectionState
          label="business status"
          status={homeResource.status}
          error={homeResource.error}
          isEmpty={false}
        >
          <p className={`react-home__status-pill ${businessStatus.isOpen ? 'is-open' : 'is-closed'}`}>
            {businessStatus.label}
          </p>
          <p>{businessStatus.details}</p>
        </SectionState>
      </section>

      <section className="react-home__section" aria-labelledby="react-home-offers-title">
        <div className="react-home__section-header">
          <h2 id="react-home-offers-title">Public offers</h2>
          <a href="#products">See all</a>
        </div>

        <SectionState
          label="offers"
          status={offersResource.status}
          error={offersResource.error}
          isEmpty={offersResource.status === 'success' && offers.length === 0}
          emptyText="There are no active offers right now."
        >
          <div className="react-home__grid">
            {offers.map((offer) => {
              const product = offer?.product || {};
              const basePrice = Number(product?.price || 0);
              const discount = Number(offer?.discountPercent || 0);
              const finalPrice = getDiscountedPrice(basePrice, discount);

              return (
                <article className="react-home__card" key={offer.id || product.id || product.name}>
                  <img src={product.imageUrl || '/img/hero1.png'} alt={product.name || 'Offer'} loading="lazy" />
                  <div className="react-home__card-body">
                    <h3>{product.name || 'Special offer'}</h3>
                    <p className="react-home__price-row">
                      {discount > 0 ? <span className="react-home__old-price">{formatPrice(basePrice)}</span> : null}
                      <strong>{formatPrice(finalPrice)}</strong>
                    </p>
                    <button
                      type="button"
                      className="btn btn-add-to-cart"
                      onClick={() => handleAddOfferToCart(offer)}
                    >
                      Add to cart
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </SectionState>
      </section>

      <section className="react-home__section" aria-labelledby="react-home-categories-title">
        <div className="react-home__section-header">
          <h2 id="react-home-categories-title">Featured categories</h2>
          <a href="#products">Browse menu</a>
        </div>

        <SectionState
          label="categories"
          status={categoriesResource.status}
          error={categoriesResource.error}
          isEmpty={categoriesResource.status === 'success' && featuredCategories.length === 0}
          emptyText="No categories available yet."
        >
          <ul className="react-home__chips" aria-label="Featured categories list">
            {featuredCategories.map((category) => (
              <li key={category.id} className="react-home__chip">
                <span>{category.name || 'Category'}</span>
              </li>
            ))}
          </ul>
        </SectionState>
      </section>
    </main>
  );
}
