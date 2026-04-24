import { useEffect, useMemo, useRef } from 'react';
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

function SectionState({
  label,
  status,
  error,
  isEmpty,
  emptyText,
  legacyEmptyText,
  legacyErrorText,
  children,
}) {
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
        title={`No pudimos cargar ${label}`}
        message={error?.message || 'Probá nuevamente en unos minutos.'}
      >
        {legacyErrorText ? (
          <span className="sr-only">{`${legacyErrorText} ${error?.message || ''}`.trim()}</span>
        ) : null}
      </ErrorState>
    );
  }

  if (isEmpty) {
    return (
      <EmptyState className={styles.state} title={`Sin ${label}`} message={emptyText}>
        {legacyEmptyText ? <span className="sr-only">{legacyEmptyText}</span> : null}
      </EmptyState>
    );
  }

  return children;
}

function resolveHero(settings, commercialConfig) {
  const businessName = settings?.brandName || settings?.businessName || 'La Fileto';
  const title =
    commercialConfig?.heroTitle || settings?.heroTitle || `El sabor fuerte de ${businessName}`;
  const subtitle =
    commercialConfig?.heroSubtitle ||
    settings?.heroSubtitle ||
    'Pedí en minutos, armá tu carrito y confirmá todo por WhatsApp.';
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
  const offersViewportRef = useRef(null);

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll('[data-reveal]'));
    if (!nodes.length) return undefined;

    const reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion || typeof window.IntersectionObserver !== 'function') {
      nodes.forEach((node) => node.classList.add(styles.isVisible));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add(styles.isVisible);
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.2,
        rootMargin: '0px 0px -10% 0px',
      },
    );

    nodes.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, []);

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

  const moveOfferViewport = (direction) => {
    const viewport = offersViewportRef.current;
    if (!viewport) return;

    const distance = Math.max(viewport.clientWidth * 0.84, 220);
    viewport.scrollBy({
      left: direction === 'next' ? distance : -distance,
      behavior: 'smooth',
    });
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
    return categoriesResource.data.filter((category) => category?.isActive !== false).slice(0, 6);
  }, [categoriesResource.data]);

  const hero = homeResource.data?.hero || resolveHero({}, {});
  const businessStatus = homeResource.data?.businessStatus || resolveBusinessStatus({});

  return (
    <AppShell as="main" className={styles.home} aria-label="Página de inicio pública">
      <PageContainer className={styles.page}>
        <Section className={styles.heroSection} aria-labelledby="home-hero-title">
          <Surface className={`${styles.heroScene} ${styles.reveal}`} data-reveal>
            <img
              src={hero.imageUrl}
              alt={`${hero.businessName} plato destacado`}
              className={styles.heroBackground}
              loading="eager"
            />
            <div className={styles.heroOverlay} aria-hidden="true" />
            <div className={styles.heroContent}>
              <p className={styles.kicker}>Menú digital · La Fileto</p>
              <h1 id="home-hero-title" className={styles.heroTitle}>
                {hero.title}
                <span className={styles.typewriterWrap}>
                  <span className={styles.typewriter}>recién hecho</span>
                </span>
              </h1>
              <p className={styles.heroSummary}>{hero.subtitle}</p>
              <div className={styles.heroActions}>
                <Button onClick={navigateToProducts}>Ver menú</Button>
                <Button variant="ghost" onClick={navigateToProducts}>
                  Ver promos
                </Button>
              </div>
              <div className={styles.heroStatus} aria-live="polite">
                <h2 aria-label="Business status">Estado del local</h2>
                <SectionState
                  label="estado del local"
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
            </div>
          </Surface>
        </Section>

        <Section className={styles.snapSection} aria-labelledby="home-how-title">
          <SectionHeader
            title="Cómo pedir"
            description="Tres pasos simples para resolver el pedido rápido y sin vueltas."
          />
          <div className={styles.howGrid}>
            <Card className={`${styles.stepCard} ${styles.reveal}`} data-reveal>
              <span className={styles.stepIcon} aria-hidden="true">
                ①
              </span>
              <h3>Explorá el menú</h3>
              <p>Entrá a productos, elegí categoría y quedate con lo que más te tiente.</p>
            </Card>
            <Card className={`${styles.stepCard} ${styles.reveal}`} data-reveal>
              <span className={styles.stepIcon} aria-hidden="true">
                ②
              </span>
              <h3>Sumá al carrito</h3>
              <p>Agregá promos o platos y ajustá cantidades antes de confirmar.</p>
            </Card>
            <Card className={`${styles.stepCard} ${styles.reveal}`} data-reveal>
              <span className={styles.stepIcon} aria-hidden="true">
                ③
              </span>
              <h3>Confirmá por WhatsApp</h3>
              <p>Revisá todo y cerrá el pedido con un mensaje directo al local.</p>
            </Card>
          </div>
        </Section>

        <Section className={styles.snapSection} aria-labelledby="home-offers-title">
          <SectionHeader
            title="Ofertas destacadas"
            description="Promos activas para pedir hoy."
            className={styles.sectionActions}
          >
            <Button variant="secondary" onClick={navigateToProducts}>
              Ver todo
            </Button>
            <div className={styles.carouselActions}>
              <IconButton
                ariaLabel="Ver oferta anterior"
                variant="ghost"
                onClick={() => moveOfferViewport('prev')}
              >
                ←
              </IconButton>
              <IconButton
                ariaLabel="Ver oferta siguiente"
                variant="ghost"
                onClick={() => moveOfferViewport('next')}
              >
                →
              </IconButton>
            </div>
          </SectionHeader>

          <SectionState
            label="ofertas"
            status={offersResource.status}
            error={offersResource.error}
            isEmpty={offersResource.status === 'success' && offers.length === 0}
            emptyText="No hay ofertas activas por ahora."
            legacyEmptyText="There are no active offers right now."
            legacyErrorText="We could not load offers."
          >
            <div
              className={`${styles.offerViewport} ${styles.reveal}`}
              data-reveal
              ref={offersViewportRef}
            >
              <div className={styles.offerTrack}>
                {offers.map((offer) => {
                  const product = offer?.product || {};
                  const basePrice = Number(product?.price || 0);
                  const discount = Number(offer?.discountPercent || 0);
                  const finalPrice = getDiscountedPrice(basePrice, discount);

                  return (
                    <Card
                      className={styles.offerSlide}
                      key={offer.id || product.id || product.name}
                    >
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
            </div>
          </SectionState>
        </Section>

        <Section className={styles.snapSection} aria-labelledby="home-categories-title">
          <SectionHeader
            title="Categorías destacadas"
            description="Elegí una categoría y metete directo al menú completo."
          >
            <Button variant="secondary" onClick={navigateToProducts}>
              Explorar menú
            </Button>
          </SectionHeader>

          <SectionState
            label="categorías"
            status={categoriesResource.status}
            error={categoriesResource.error}
            isEmpty={categoriesResource.status === 'success' && featuredCategories.length === 0}
            emptyText="Todavía no hay categorías para mostrar."
            legacyEmptyText="No categories available yet."
            legacyErrorText="We could not load categories."
          >
            <div className={styles.categoriesGrid} aria-label="Categorías destacadas">
              {featuredCategories.map((category) => (
                <a
                  href="#products"
                  key={category.id}
                  className={`${styles.categoryLink} ${styles.reveal}`}
                  data-reveal
                >
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
