import { useEffect, useMemo, useRef, useState } from 'react';
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
import { AppShell, Section } from '/src/components/layout/AppShell.jsx';
import { Button, IconButton } from '/src/components/ui/Button.jsx';
import { Card } from '/src/components/ui/Surface.jsx';
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
        title={`No pudimos cargar ${label}`}
        message={error?.message || 'Probá nuevamente en unos minutos.'}
      />
    );
  }

  if (isEmpty) {
    return <EmptyState className={styles.state} title={`Sin ${label}`} message={emptyText} />;
  }

  return children;
}

function HomeSectionHeading({ eyebrow, id, title, description, actions, centered = false }) {
  return (
    <header className={`${styles.sectionHeading} ${centered ? styles.headingCentered : ''}`.trim()}>
      <div className={styles.headingCopy}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 id={id}>{title}</h2>
        <span className={styles.ornament} aria-hidden="true" />
        {description ? <p className={styles.sectionSummary}>{description}</p> : null}
      </div>
      {actions ? <div className={styles.sectionControls}>{actions}</div> : null}
    </header>
  );
}

function renderStepIcon(icon) {
  if (icon === 'choose') {
    return (
      <svg className={styles.stepIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 3.75v16.5" />
        <path d="M4.5 3.75v5.1a2.5 2.5 0 0 0 5 0v-5.1" />
        <path d="M15.5 20.25V3.75c2.45 1.05 3.35 3.32 3.35 6.05v2.45H15.5" />
      </svg>
    );
  }

  if (icon === 'add') {
    return (
      <svg className={styles.stepIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3.75 5.25h2.2l2.1 9h8.75l2.1-6.25H6.7" />
        <path d="M9.2 18.5h.1" />
        <path d="M16 18.5h.1" />
        <path d="M12.8 9.5v4.1" />
        <path d="M10.75 11.55h4.1" />
      </svg>
    );
  }

  return (
    <svg className={styles.stepIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4.5a7.5 7.5 0 0 1 6.15 11.8l.95 3.2-3.35-.82A7.5 7.5 0 1 1 12 4.5Z" />
      <path d="M9.1 9.1c.45-.45.92-.3 1.18.16l.58 1.03c.18.32.12.62-.1.88l-.43.5a5.15 5.15 0 0 0 2.12 2.12l.5-.43c.26-.22.56-.28.88-.1l1.03.58c.46.26.61.73.16 1.18-.54.54-1.2.72-1.92.5-2.36-.72-4.16-2.52-4.88-4.88-.22-.72-.04-1.38.5-1.92Z" />
    </svg>
  );
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
  const [activeOfferIndex, setActiveOfferIndex] = useState(0);

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
    return categoriesResource.data.filter((category) => category?.isActive !== false).slice(0, 4);
  }, [categoriesResource.data]);

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
        threshold: 0.18,
        rootMargin: '0px 0px -8% 0px',
      },
    );

    nodes.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, [featuredCategories.length, offers.length]);

  useEffect(() => {
    const viewport = offersViewportRef.current;
    if (!viewport || offers.length < 1) return undefined;

    const syncActiveOffer = () => {
      const slides = Array.from(viewport.querySelectorAll('[data-offer-slide]'));
      if (!slides.length) return;

      const index = slides.reduce((closestIndex, slide, indexValue) => {
        const currentDistance = Math.abs(slide.offsetLeft - viewport.scrollLeft);
        const closestDistance = Math.abs(slides[closestIndex].offsetLeft - viewport.scrollLeft);
        return currentDistance < closestDistance ? indexValue : closestIndex;
      }, 0);

      setActiveOfferIndex(index);
    };

    setActiveOfferIndex(0);
    viewport.addEventListener('scroll', syncActiveOffer, { passive: true });
    window.addEventListener('resize', syncActiveOffer);

    return () => {
      viewport.removeEventListener('scroll', syncActiveOffer);
      window.removeEventListener('resize', syncActiveOffer);
    };
  }, [offers.length]);

  const moveOfferViewport = (direction) => {
    const viewport = offersViewportRef.current;
    if (!viewport || !offers.length) return;

    const delta = direction === 'next' ? 1 : -1;
    const nextIndex = Math.min(Math.max(activeOfferIndex + delta, 0), offers.length - 1);
    const slide = viewport.querySelector(`[data-offer-slide="${nextIndex}"]`);
    if (!slide) return;

    viewport.scrollTo({
      left: slide.offsetLeft,
      behavior: 'smooth',
    });
    setActiveOfferIndex(nextIndex);
  };

  const hero = homeResource.data?.hero || resolveHero({}, {});
  const businessStatus = homeResource.data?.businessStatus || resolveBusinessStatus({});

  return (
    <AppShell as="main" className={styles.home} aria-label="Página de inicio pública">
      <Section className={styles.heroSection} aria-labelledby="home-hero-title">
        <img
          src={hero.imageUrl}
          alt=""
          aria-hidden="true"
          className={styles.heroBackground}
          loading="eager"
        />
        <div className={styles.heroOverlay} aria-hidden="true" />
        <div className={`${styles.heroContent} ${styles.reveal}`} data-reveal>
          <p className={styles.eyebrow}>Menú digital · La Fileto</p>
          <h1 id="home-hero-title" className={styles.heroTitle}>
            {hero.title}
          </h1>
          <p className={styles.heroSummary}>{hero.subtitle}</p>
          <div className={styles.heroActions}>
            <Button className={styles.heroPrimary} onClick={navigateToProducts}>
              Ver menú
            </Button>
            <Button className={styles.heroSecondary} variant="ghost" onClick={navigateToProducts}>
              Ver ofertas
            </Button>
          </div>
          <div className={styles.heroStatus} aria-live="polite">
            <p className={styles.statusLabel}>Estado del local</p>
            <SectionState
              label="estado del local"
              status={homeResource.status}
              error={homeResource.error}
              isEmpty={false}
            >
              <div className={styles.statusReady}>
                <StatusBadge
                  isActive={businessStatus.isOpen}
                  activeText="Abierto ahora"
                  inactiveText="Cerrado ahora"
                />
                <p className={styles.statusText}>{businessStatus.details}</p>
              </div>
            </SectionState>
          </div>
        </div>
      </Section>

      <Section className={styles.howSection} aria-labelledby="home-how-title">
        <div className={styles.sectionInner}>
          <HomeSectionHeading
            centered
            eyebrow="Tu pedido"
            id="home-how-title"
            title="Cómo pedir"
            description="Tres pasos simples para disfrutar La Fileto en minutos."
          />
          <div className={styles.howGrid}>
            {[
              {
                step: 1,
                icon: 'choose',
                title: 'Elegí tu favorito',
                text: 'Recorré el menú y encontrá el plato que más te tiente.',
              },
              {
                step: 2,
                icon: 'add',
                title: 'Sumalo al carrito',
                text: 'Agregá productos u ofertas y ajustá las cantidades.',
              },
              {
                step: 3,
                icon: 'confirm',
                title: 'Confirmá por WhatsApp',
                text: 'Revisá tu pedido y envialo directo al local.',
              },
            ].map(({ step, icon, title, text }) => (
              <Card
                as="article"
                className={`${styles.stepCard} ${styles.reveal}`}
                data-reveal
                key={step}
                tabIndex={0}
              >
                <span className={styles.stepEmblem}>{renderStepIcon(icon)}</span>
                <h3>
                  <span className={styles.srOnly}>Paso {step}: </span>
                  {title}
                </h3>
                <p>{text}</p>
              </Card>
            ))}
          </div>
        </div>
      </Section>

      <Section className={styles.offersSection} aria-labelledby="home-offers-title">
        <div className={styles.sectionInner}>
          <HomeSectionHeading
            eyebrow="Para aprovechar hoy"
            id="home-offers-title"
            title="Ofertas destacadas"
            description="Promos activas, listas para sumar a tu pedido."
            actions={
              offers.length ? (
                <div className={styles.carouselTools}>
                  <span className={styles.carouselCount} aria-live="polite">
                    {activeOfferIndex + 1} / {offers.length}
                  </span>
                  <IconButton
                    ariaLabel="Ver oferta anterior"
                    className={styles.carouselButton}
                    variant="ghost"
                    disabled={activeOfferIndex === 0}
                    onClick={() => moveOfferViewport('prev')}
                  >
                    ←
                  </IconButton>
                  <IconButton
                    ariaLabel="Ver oferta siguiente"
                    className={styles.carouselButton}
                    variant="ghost"
                    disabled={activeOfferIndex === offers.length - 1}
                    onClick={() => moveOfferViewport('next')}
                  >
                    →
                  </IconButton>
                </div>
              ) : null
            }
          />

          <SectionState
            label="ofertas"
            status={offersResource.status}
            error={offersResource.error}
            isEmpty={offersResource.status === 'success' && offers.length === 0}
            emptyText="No hay ofertas activas por ahora."
          >
            <div
              className={`${styles.offerViewport} ${styles.reveal}`}
              data-reveal
              ref={offersViewportRef}
              role="region"
              aria-roledescription="carrusel"
              aria-label="Ofertas destacadas"
            >
              <div className={styles.offerTrack}>
                {offers.map((offer, index) => {
                  const product = offer?.product || {};
                  const basePrice = Number(product?.price || 0);
                  const discount = Number(offer?.discountPercent || 0);
                  const finalPrice = getDiscountedPrice(basePrice, discount);

                  return (
                    <Card
                      as="article"
                      className={styles.offerSlide}
                      data-offer-slide={index}
                      key={offer.id || product.id || product.name}
                      aria-label={`Oferta ${index + 1} de ${offers.length}`}
                    >
                      <img
                        className={styles.offerImage}
                        src={product.imageUrl || '/img/hero1.png'}
                        alt={product.name || 'Oferta destacada'}
                        loading="lazy"
                      />
                      <div className={styles.offerBody}>
                        <div className={styles.offerCopy}>
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
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </SectionState>
        </div>
      </Section>

      <Section className={styles.categoriesSection} aria-labelledby="home-categories-title">
        <div className={styles.sectionInner}>
          <HomeSectionHeading
            centered
            eyebrow="Explorá por antojo"
            id="home-categories-title"
            title="Categorías destacadas"
            description="Una selección breve para llegar rápido al menú completo."
          />
          <SectionState
            label="categorías"
            status={categoriesResource.status}
            error={categoriesResource.error}
            isEmpty={categoriesResource.status === 'success' && featuredCategories.length === 0}
            emptyText="Todavía no hay categorías para mostrar."
          >
            <div className={styles.categoriesGrid} aria-label="Categorías destacadas">
              {featuredCategories.map((category) => (
                <a
                  href="#products"
                  key={category.id}
                  className={`${styles.categoryLink} ${styles.reveal}`}
                  data-reveal
                  aria-label={`Ver productos de ${category.name || 'esta categoría'}`}
                >
                  <Card as="article" className={styles.categoryCard}>
                    <img
                      className={styles.categoryImage}
                      src={category.imageUrl || '/img/hero1.png'}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                    />
                    <div className={styles.categoryOverlay} aria-hidden="true" />
                    <div className={styles.categoryContent}>
                      <p className={styles.categoryTag}>Categoría</p>
                      <h3 className={styles.categoryName}>{category.name || 'Categoría'}</h3>
                    </div>
                  </Card>
                </a>
              ))}
            </div>
          </SectionState>
        </div>
      </Section>
    </AppShell>
  );
}
