import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { createFocusTrap } from 'focus-trap';
import { Minus, Plus, ShoppingCart, X } from 'lucide-react';
import { Badge } from '/src/components/ui/Badge.jsx';
import { Button } from '/src/components/ui/Button.jsx';
import { formatPrice } from '/src/utils/helpers.js';
import { buildProductCartPayload } from '../utils/productCartPayload.js';
import styles from './ProductDetailOverlay.module.css';

export function ProductDetailOverlay({
  product,
  isOpen,
  onClose,
  onAddToCart,
  returnFocusElement,
}) {
  const [quantity, setQuantity] = useState(1);
  const [imageFailed, setImageFailed] = useState(false);
  const panelRef = useRef(null);
  const closeButtonRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!isOpen || !product) {
      return undefined;
    }

    setQuantity(1);
    setImageFailed(false);
    return undefined;
  }, [isOpen, product]);

  useEffect(() => {
    if (!isOpen || !product || !panelRef.current) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const trap = createFocusTrap(panelRef.current, {
      allowOutsideClick: true,
      escapeDeactivates: false,
      fallbackFocus: panelRef.current,
      initialFocus: closeButtonRef.current || panelRef.current,
      returnFocusOnDeactivate: false,
      tabbableOptions: {
        displayCheck: 'none',
      },
    });

    trap.activate();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      trap.deactivate();
      document.body.style.overflow = previousOverflow;
      returnFocusElement?.focus?.();
    };
  }, [isOpen, onClose, product, returnFocusElement]);

  if (!isOpen || !product) {
    return null;
  }

  const {
    name = 'Producto',
    categoryName = '',
    description = 'Sin descripcion disponible.',
    imageUrl = '/img/hero1.png',
    originalPrice = 0,
    finalPrice = 0,
    discountPercent = 0,
  } = product;
  const hasDiscount = Number(discountPercent) > 0;
  const hasOldPrice = hasDiscount || Number(originalPrice) > Number(finalPrice);
  const cartPayload = buildProductCartPayload(product, quantity);

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleAddToCart = () => {
    onAddToCart(cartPayload);
  };

  return createPortal(
    <div className={styles.backdrop} onMouseDown={handleBackdropClick}>
      <section
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
      >
        <button
          type="button"
          ref={closeButtonRef}
          aria-label={`Cerrar detalle de ${name}`}
          className={styles.closeButton}
          onClick={onClose}
        >
          <X size={20} aria-hidden="true" />
        </button>

        <div className={styles.media}>
          {imageFailed ? (
            <div
              className={styles.imagePlaceholder}
              role="img"
              aria-label={`Imagen no disponible para ${name}`}
            >
              <span>La Fileto</span>
              <strong>Imagen no disponible</strong>
            </div>
          ) : (
            <img
              className={styles.image}
              src={imageUrl}
              alt={name}
              onError={() => setImageFailed(true)}
            />
          )}
          {hasDiscount ? (
            <Badge tone="warning" className={styles.discountBadge}>
              -{discountPercent}%
            </Badge>
          ) : null}
        </div>

        <div className={styles.content}>
          {categoryName ? <p className={styles.category}>{categoryName}</p> : null}
          <h2 id={titleId} className={styles.title}>
            {name}
          </h2>
          <p id={descriptionId} className={styles.description}>
            {description}
          </p>

          <div className={styles.priceRow}>
            <strong className={styles.price}>{formatPrice(finalPrice)}</strong>
            {hasOldPrice ? (
              <span className={styles.oldPrice}>{formatPrice(originalPrice)}</span>
            ) : null}
          </div>

          <div className={styles.purchase}>
            <div className={styles.stepper} role="group" aria-label={`Cantidad de ${name}`}>
              <button
                type="button"
                className={styles.stepperButton}
                aria-label={`Disminuir cantidad de ${name}`}
                disabled={quantity === 1}
                onClick={() => setQuantity((current) => Math.max(1, current - 1))}
              >
                <Minus size={18} aria-hidden="true" />
              </button>
              <span className={styles.quantity} aria-live="polite">
                {quantity}
              </span>
              <button
                type="button"
                className={styles.stepperButton}
                aria-label={`Aumentar cantidad de ${name}`}
                disabled={quantity === 99}
                onClick={() => setQuantity((current) => Math.min(99, current + 1))}
              >
                <Plus size={18} aria-hidden="true" />
              </button>
            </div>

            <Button className={styles.addButton} onClick={handleAddToCart}>
              <ShoppingCart size={19} aria-hidden="true" />
              Agregar al carrito
            </Button>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}
