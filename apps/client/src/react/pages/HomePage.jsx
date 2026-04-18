import { useMemo } from 'react';
import {
  fetchBusinessStatus,
  fetchCommercialConfig,
  fetchPublicCategories,
  fetchPublicOffers,
  fetchPublicSettings,
} from '../services/publicApi.js';
import { useAsyncResource } from '../hooks/useAsyncResource.jsx';
import { formatPrice, getDiscountedPrice } from '/src/utils/helpers.js';
import { addToCart } from '/src/utils/cartService.js';
import { showSnackbar } from '/src/utils/showSnackbar.js';
import {
  AppShell,
  PageContainer,
  Section,
  SectionHeader,
} from '/src/components/layout/AppShell.jsx';
import { Button, IconButton } from '/src/components/ui/Button.jsx';
import { Card, Surface } from '/src/components/ui/Surface.jsx';
import { StatusBadge } from '/src/components/ui/Badge.jsx';
import { EmptyState, ErrorState, LoadingState } from '/src/components/ui/State.jsx';
import styles from './HomePage.module.css';

function SectionState({ label, status, error, isEmpty, emptyText, children }) {
  if (status === 'loading') {
    return (
      <LoadingState
        className={styles.state}
        title={`Cargando ${label}`}
        message="Esperá un segundo…"
      />
    );
  }

  if (status === 'error') {
    return (
      <ErrorState
        className={styles.state}
        title={`We could not load ${label}. `}
        message={error?.message || 'Please try again.'}
      />
    );
  }

  if (isEmpty) {
    return (
      <EmptyState className={styles.state} title={`Sin ${label} por ahora`} message={emptyText} />
    );
  }

  return children;
}

function resolveHero(settings, commercialConfig) {
  const businessName = settings?.brandName || settings?.businessName || 'La Fileto';
  const title =
    commercialConfig?.heroTitle || settings?.heroTitle || `Pedí lo mejor de ${businessName}`;
  const subtitle =
    commercialConfig?.heroSubtitle ||
    settings?.heroSubtitle ||
    'Comé rico, pedí rápido y confirmá por WhatsApp en minutos.';
  const imageUrl = commercialConfig?.heroImageUrl || settings?.heroImageUrl || '/img/hero1.png';

  return { title, subtitle, imageUrl, businessName };
}

function resolveBusinessStatus(statusData) {
  const isOpen = statusData?.isOpen === true;
  const details = [statusData?.message, statusData?.reason, statusData?.nextOpeningTime]
    .filter(Boolean)
    .join(' · ');

  return {
    isOpen,
    details: details || 'Consultá horarios y disponibilidad antes de confirmar tu pedido.',
  };
}

function navigateToProducts() {
  window.location.hash = '#products';
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
      name: product.name || 'Promo destacada',
      price: finalPrice,
      image: product.imageUrl || '/img/hero1.png',
      source: 'offers',
      quantity: 1,
    });

    showSnackbar(`Agregado al carrito: ${product.name || 'Promo destacada'}`);
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
    <AppShell as="main" className={styles.home} aria-label="Página de inicio pública">
      <PageContainer>
        <Section className={styles.snapSection} aria-labelledby="home-hero-title">
          <div className={styles.heroGrid}>
            <Surface>
              <p className={styles.kicker}>Menú digital · La Fileto</p>
              <h1 id="home-hero-title" className={styles.heroTitle}>
                {hero.title}
              </h1>
              <p className={styles.heroSummary}>{hero.subtitle}</p>
              <div className={styles.heroActions}>
                <Button onClick={navigateToProducts}>Ver menú</Button>
                <a href="#products" className={styles.linkButton}>
                  Ir a productos
                </a>
              </div>
              <div className={styles.heroStatus} aria-live="polite">
                <h2>Business status</h2>
                <SectionState
                  label="business status"
                  status={homeResource.status}
                  error={homeResource.error}
                  isEmpty={false}
                >
                  <StatusBadge
                    isActive={businessStatus.isOpen}
                    activeText="Abierto ahora"
                    inactiveText="Cerrado ahora"
                  />
                  <p className={styles.statusText}>{businessStatus.details}</p>
                </SectionState>
              </div>
            </Surface>
            <div className={styles.heroImageWrap}>
              <img
                src={hero.imageUrl}
                alt={`${hero.businessName} plato destacado`}
                className={styles.heroImage}
                loading="eager"
              />
            </div>
          </div>
        </Section>

        <Section className={styles.snapSection} aria-labelledby="home-how-title">
          <SectionHeader title="Cómo pedir" description="En tres pasos simples, sin vueltas." />
          <div className={styles.howGrid}>
            <Card className={styles.stepCard}>
              <p className={styles.stepKicker}>Paso 1</p>
              <h3>Explorá el menú</h3>
              <p>Entrá a productos, filtrá por categoría y elegí tus favoritos.</p>
            </Card>
            <Card className={styles.stepCard}>
              <p className={styles.stepKicker}>Paso 2</p>
              <h3>Sumá al carrito</h3>
              <p>Agregá promos o platos y ajustá cantidades cuando quieras.</p>
            </Card>
            <Card className={styles.stepCard}>
              <p className={styles.stepKicker}>Paso 3</p>
              <h3>Confirmá por WhatsApp</h3>
              <p>Revisá el pedido final y cerralo en segundos con un mensaje.</p>
            </Card>
          </div>
        </Section>

        <Section className={styles.snapSection} aria-labelledby="home-offers-title">
          <SectionHeader
            title="Ofertas destacadas"
            description="Aprovechá promos activas de hoy."
            className={styles.sectionActions}
          >
            <Button variant="secondary" onClick={navigateToProducts}>
              Ver todo
            </Button>
            <IconButton
              ariaLabel="Ir al menú completo"
              variant="ghost"
              onClick={navigateToProducts}
            >
              →
            </IconButton>
          </SectionHeader>

          <SectionState
            label="offers"
            status={offersResource.status}
            error={offersResource.error}
            isEmpty={offersResource.status === 'success' && offers.length === 0}
            emptyText="There are no active offers right now."
          >
            <div className={styles.offerRail} aria-label="Carrusel de ofertas destacadas">
              {offers.map((offer) => {
                const product = offer?.product || {};
                const basePrice = Number(product?.price || 0);
                const discount = Number(offer?.discountPercent || 0);
                const finalPrice = getDiscountedPrice(basePrice, discount);

                return (
                  <Card className={styles.offerCard} key={offer.id || product.id || product.name}>
                    <img
                      className={styles.offerImage}
                      src={product.imageUrl || '/img/hero1.png'}
                      alt={product.name || 'Oferta'}
                      loading="lazy"
                    />
                    <div>
                      <h3>{product.name || 'Promo destacada'}</h3>
                      <div className={styles.offerMeta}>
                        {discount > 0 ? (
                          <span className={styles.oldPrice}>{formatPrice(basePrice)}</span>
                        ) : null}
                        <strong className={styles.price}>{formatPrice(finalPrice)}</strong>
                        {discount > 0 ? (
                          <StatusBadge isActive activeText={`-${discount}%`} />
                        ) : null}
                      </div>
                    </div>
                    <Button
                      className={`btn-add-to-cart ${styles.offerButton}`}
                      data-id={product?.id ?? ''}
                      data-name={product?.name ?? ''}
                      data-price={String(finalPrice)}
                      data-image={product?.imageUrl || '/img/hero1.png'}
                      data-source="offers"
                      onClick={() => handleAddOfferToCart(offer)}
                    >
                      Agregar al carrito
                    </Button>
                  </Card>
                );
              })}
            </div>
          </SectionState>
        </Section>

        <Section className={styles.snapSection} aria-labelledby="home-categories-title">
          <SectionHeader
            title="Categorías destacadas"
            description="Encontrá más rápido lo que tenés ganas de comer."
          >
            <Button variant="secondary" onClick={navigateToProducts}>
              Explorar menú
            </Button>
          </SectionHeader>

          <SectionState
            label="categories"
            status={categoriesResource.status}
            error={categoriesResource.error}
            isEmpty={categoriesResource.status === 'success' && featuredCategories.length === 0}
            emptyText="No categories available yet."
          >
            <div className={styles.categoriesGrid} aria-label="Categorías destacadas">
              {featuredCategories.map((category) => (
                <a href="#products" key={category.id}>
                  <Card as="article" className={styles.categoryCard}>
                    <img
                      className={styles.categoryImage}
                      src={category.imageUrl || '/img/hero1.png'}
                      alt={category.name || 'Categoría'}
                      loading="lazy"
                    />
                    <p className={styles.categoryName}>{category.name || 'Categoría'}</p>
                  </Card>
                </a>
              ))}
            </div>
          </SectionState>
        </Section>
      </PageContainer>
    </AppShell>
  );
}
