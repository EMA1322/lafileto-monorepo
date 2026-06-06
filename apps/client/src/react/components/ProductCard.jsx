import { useState } from 'react';
import { Button } from '/src/components/ui/Button.jsx';
import { Badge } from '/src/components/ui/Badge.jsx';
import { Card } from '/src/components/ui/Surface.jsx';
import { formatPrice } from '/src/utils/helpers.js';
import { Eye } from 'lucide-react';
import { buildProductCartPayload } from '../utils/productCartPayload.js';
import styles from './ProductCard.module.css';

export function ProductCard({
  product,
  onAddToCart,
  onOpenDetail,
  className = '',
  articleProps = {},
}) {
  const [quantity, setQuantity] = useState(1);
  const [imageFailed, setImageFailed] = useState(false);
  const {
    id,
    name = 'Producto',
    description = '',
    categoryName = '',
    imageUrl = '/img/hero1.png',
    originalPrice = 0,
    finalPrice = 0,
    discountPercent = 0,
    source = 'products',
  } = product;
  const hasDiscount = Number(discountPercent) > 0;
  const cartPayload = buildProductCartPayload(product, quantity);

  return (
    <Card as="article" {...articleProps} className={`${styles.card} ${className}`.trim()}>
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
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        )}
        {hasDiscount ? (
          <Badge tone="warning" className={styles.discountBadge}>
            -{discountPercent}%
          </Badge>
        ) : null}
      </div>
      <div className={styles.body}>
        <div className={styles.copy}>
          {categoryName ? <p className={styles.category}>{categoryName}</p> : null}
          <h3 className={styles.title}>{name}</h3>
          {description ? <p className={styles.description}>{description}</p> : null}
        </div>
        <div className={styles.priceRow}>
          <strong className={styles.price}>{formatPrice(finalPrice)}</strong>
          {hasDiscount ? (
            <span className={styles.oldPrice}>{formatPrice(originalPrice)}</span>
          ) : null}
        </div>
        <div className={styles.actions}>
          <div className={styles.stepper} role="group" aria-label={`Cantidad de ${name}`}>
            <button
              type="button"
              className={styles.stepperButton}
              aria-label={`Disminuir cantidad de ${name}`}
              disabled={quantity === 1}
              onClick={() => setQuantity((current) => Math.max(1, current - 1))}
            >
              -
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
              +
            </button>
          </div>
          <div className={styles.actionButtons}>
            {onOpenDetail ? (
              <Button
                variant="ghost"
                className={styles.detailButton}
                onClick={(event) => onOpenDetail(product, event)}
              >
                <Eye size={18} aria-hidden="true" />
                Ver detalle
              </Button>
            ) : null}
            <Button
              className={`btn-add-to-cart ${styles.button}`}
              data-id={id ?? ''}
              data-name={name}
              data-price={String(finalPrice)}
              data-image={imageUrl}
              data-source={source}
              onClick={() => onAddToCart(cartPayload)}
            >
              Agregar al carrito
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
