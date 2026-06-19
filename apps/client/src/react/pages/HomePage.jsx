import { useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchBusinessStatus,
  fetchCommercialConfig,
  fetchPublicCategories,
  fetchPublicOffers,
  fetchPublicSettings,
} from '../services/publicApi.js';
import { useAsyncResource } from '../hooks/useAsyncResource.jsx';
import { getDiscountedPrice } from '/src/utils/helpers.js';
import { addToCart, getCart, updateQuantity } from '/src/utils/cartService.js';
import { showSnackbar } from '/src/utils/showSnackbar.js';
import { AppShell, Section } from '/src/components/layout/AppShell.jsx';
import { Button, IconButton } from '/src/components/ui/Button.jsx';
import { Card } from '/src/components/ui/Surface.jsx';
import { StatusBadge } from '/src/components/ui/Badge.jsx';
import { EmptyState, ErrorState, LoadingState } from '/src/components/ui/State.jsx';
import { ProductCard } from '../components/ProductCard.jsx';
import { ArrowRight, MessageCircle, ShoppingCart, Utensils } from 'lucide-react';
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
  const icons = {
    choose: Utensils,
    add: ShoppingCart,
    confirm: MessageCircle,
  };
  const StepIcon = icons[icon] || MessageCircle;

  return <StepIcon className={styles.stepIcon} aria-hidden="true" strokeWidth={1.7} />;
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

function scrollToOffers() {
  const offersTitle = document.getElementById('home-offers-title');
  const reducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  offersTitle?.scrollIntoView({
    behavior: reducedMotion ? 'auto' : 'smooth',
    block: 'start',
  });
}

function normalizeOfferProduct(offer) {
  const product = offer?.product || {};
  const originalPrice = Number(product?.price || 0);
  const discountPercent = Number(offer?.discountPercent || 0);

  return {
    id: product?.id,
    name: product?.name || 'Promo destacada',
    description: product?.description || '',
    categoryName: product?.category?.name || '',
    imageUrl: product?.imageUrl || '/img/hero1.png',
    originalPrice,
    finalPrice: getDiscountedPrice(originalPrice, discountPercent),
    discountPercent,
    source: 'offers',
  };
}

export function HomePage() {
  const offersViewportRef = useRef(null);
  const [activeOfferIndex, setActiveOfferIndex] = useState(0);

  const handleAddOfferToCart = (product) => {
    if (product.id == null || product.id === '') return;

    const existingQuantity =
      getCart().find((item) => item.id === String(product.id))?.quantity || 0;
    addToCart(product);
    if (product.quantity > 1) {
      updateQuantity(product.id, existingQuantity + product.quantity);
    }
    showSnackbar(`Agregado al carrito: ${product.name}`);
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
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Menú digital · {hero.businessName}</p>
            <h1 id="home-hero-title" className={styles.heroTitle}>
              {hero.title}
            </h1>
            <p className={styles.heroSummary}>{hero.subtitle}</p>
            <div className={styles.heroActions}>
              <Button className={styles.heroPrimary} onClick={navigateToProducts}>
                Ver menú
                <ArrowRight size={18} aria-hidden="true" />
              </Button>
              <Button className={styles.heroSecondary} variant="ghost" onClick={scrollToOffers}>
                Ver ofertas
              </Button>
            </div>
            <div className={styles.heroPromises} aria-label="Ventajas del pedido">
              <span>Pedí rico y sin vueltas</span>
              <span>Te lo preparamos al toque</span>
              <span>Confirmá por WhatsApp</span>
            </div>
          </div>

          <div className={styles.heroPanel} aria-live="polite">
            <div className={styles.heroPanelHeader}>
              <p className={styles.statusLabel}>Estado del local</p>
              <span className={styles.panelMark} aria-hidden="true">
                LF
              </span>
            </div>
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
            <div className={styles.panelRows} aria-label="Resumen del pedido">
              <div>
                <span>01</span>
                <strong>Elegí</strong>
                <p>Menú y promos activas.</p>
              </div>
              <div>
                <span>02</span>
                <strong>Revisá</strong>
                <p>Carrito claro antes de confirmar.</p>
              </div>
              <div>
                <span>03</span>
                <strong>Mandá</strong>
                <p>Pedido directo por WhatsApp.</p>
              </div>
            </div>
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
                  const product = normalizeOfferProduct(offer);

                  return (
                    <ProductCard
                      className={styles.offerSlide}
                      key={offer.id || product.id || product.name}
                      product={product}
                      onAddToCart={handleAddOfferToCart}
                      articleProps={{
                        'data-offer-slide': index,
                        'aria-label': `Oferta ${index + 1} de ${offers.length}`,
                      }}
                    />
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
                      <span className={styles.categoryAction}>
                        Ver menú
                        <ArrowRight size={16} aria-hidden="true" />
                      </span>
                    </div>
                  </Card>
                </a>
              ))}
            </div>
          </SectionState>
          <div className={`${styles.bottomCta} ${styles.reveal}`} data-reveal>
            <p>Mirá el menú completo y armá tu pedido en minutos.</p>
            <Button className={styles.bottomCtaButton} onClick={navigateToProducts}>
              Armar pedido
              <ArrowRight size={18} aria-hidden="true" />
            </Button>
          </div>
        </div>
      </Section>
    </AppShell>
  );
}
