import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Minus, Plus, ShoppingBag, ShoppingCart, Trash } from 'lucide-react';
import { clearCart, getCart, removeFromCart, updateQuantity } from '/src/utils/cartService.js';
import { formatPrice } from '/src/utils/helpers.js';
import { loadCommercialContext } from '/src/utils/commercialContext.js';
import { AsyncStateNotice } from '../components/AsyncStateNotice.jsx';
import styles from './CartPage.module.css';

const SOURCE_LABELS = {
  offers: 'Oferta destacada',
  products: 'Menu',
};

function getSafeCart() {
  const cart = getCart();
  return Array.isArray(cart) ? cart : [];
}

function getSourceLabel(source) {
  const key = String(source || '')
    .trim()
    .toLowerCase();
  return SOURCE_LABELS[key] || 'Producto';
}

function getLineTotal(item) {
  return Number(item.price || 0) * Number(item.quantity || 0);
}

export function CartPage() {
  const [items, setItems] = useState(() => getSafeCart());
  const [statusMessage, setStatusMessage] = useState('');
  const [businessOpen, setBusinessOpen] = useState(true);

  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        const quantity = Number(item.quantity || 0);
        const lineTotal = getLineTotal(item);

        return {
          amount: acc.amount + lineTotal,
          units: acc.units + quantity,
        };
      },
      { amount: 0, units: 0 },
    );
  }, [items]);

  useEffect(() => {
    const syncCart = () => setItems(getSafeCart());

    const onStorage = (event) => {
      if (event.key === 'cart') {
        syncCart();
      }
    };

    window.addEventListener('storage', onStorage);
    document.addEventListener('cart:updated', syncCart);

    return () => {
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('cart:updated', syncCart);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadBusinessStatus() {
      const context = await loadCommercialContext();
      if (!mounted) return;

      setBusinessOpen(context.businessOpen);

      if (!context.businessOpen) {
        setStatusMessage('El local esta cerrado por ahora.');
        return;
      }

      if (context.errorMessage) {
        setStatusMessage(context.errorMessage);
      }
    }

    loadBusinessStatus();

    return () => {
      mounted = false;
    };
  }, []);

  const handleChangeQty = (id, delta) => {
    const item = items.find((entry) => String(entry.id) === String(id));
    if (!item) return;

    const currentQty = Math.max(1, Number(item.quantity || 1));
    const nextQty = Math.max(1, currentQty + delta);
    if (nextQty === currentQty) return;

    updateQuantity(String(id), nextQty);
    setStatusMessage(`Cantidad de ${item.name}: ${nextQty}`);
  };

  const handleRemove = (id) => {
    const item = items.find((entry) => String(entry.id) === String(id));
    removeFromCart(String(id));

    if (item) {
      setStatusMessage(`${item.name} eliminado del carrito.`);
    }
  };

  const handleClear = () => {
    if (!items.length) return;

    const shouldClear = window.confirm('Vaciar carrito?');
    if (!shouldClear) return;

    clearCart();
    setStatusMessage('Carrito vaciado.');
  };

  const isEmpty = items.length === 0;
  const isConfirmBlocked = isEmpty || !businessOpen;

  return (
    <main className={styles.page} aria-labelledby="cart-title">
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.eyebrow}>
            <ShoppingCart size={18} aria-hidden="true" />
            <span>Carrito</span>
          </div>
          <h1 id="cart-title" className={styles.title}>
            Revision del pedido
          </h1>
          <p className={styles.subtitle}>
            Controla productos, cantidades y total antes de confirmar por WhatsApp.
          </p>
        </header>

        <div id="cart-status" className={styles.status} role="status" aria-live="polite">
          {statusMessage}
        </div>

        {isEmpty ? (
          <section id="cart-empty" className={styles.empty} aria-label="Carrito vacio">
            <span className={styles.emptyIcon} aria-hidden="true">
              <ShoppingBag size={34} />
            </span>
            <div className={styles.emptyCopy}>
              <h2 className={styles.emptyTitle}>Tu carrito esta vacio</h2>
              <p className={styles.emptyText}>
                Elegi productos del menu y volve para revisar tu pedido.
              </p>
            </div>
            <a className={styles.primaryLink} href="#products">
              Ver productos
              <ArrowRight size={18} aria-hidden="true" />
            </a>
          </section>
        ) : (
          <div className={styles.layout}>
            <section className={styles.itemsPanel} aria-labelledby="cart-items-title">
              <div className={styles.sectionHeader}>
                <div>
                  <h2 id="cart-items-title" className={styles.sectionTitle}>
                    Productos agregados
                  </h2>
                  <p className={styles.sectionNote}>
                    {totals.units} {totals.units === 1 ? 'unidad' : 'unidades'} en el carrito
                  </p>
                </div>
              </div>

              <ul id="cart-items" className={styles.items} aria-busy="false">
                {items.map((item) => {
                  const quantity = Number(item.quantity || 0);
                  const lineTotal = getLineTotal(item);
                  const sourceLabel = getSourceLabel(item.source);

                  return (
                    <li className={styles.item} key={item.id} data-id={String(item.id)}>
                      <div className={styles.imageWrap}>
                        <img
                          className={styles.image}
                          src={item.image || '/img/hero1.png'}
                          alt={item.name || 'Producto del carrito'}
                          loading="lazy"
                        />
                      </div>

                      <div className={styles.itemBody}>
                        <div className={styles.itemTop}>
                          <div className={styles.itemCopy}>
                            <p className={styles.source}>{sourceLabel}</p>
                            <h3 className={styles.itemName}>{item.name}</h3>
                          </div>
                          <button
                            className={styles.removeButton}
                            type="button"
                            onClick={() => handleRemove(item.id)}
                            aria-label={`Eliminar ${item.name} del carrito`}
                          >
                            <Trash size={18} aria-hidden="true" />
                          </button>
                        </div>

                        <dl className={styles.itemMeta}>
                          <div>
                            <dt>Precio unitario</dt>
                            <dd>{formatPrice(item.price)}</dd>
                          </div>
                          <div>
                            <dt>Subtotal</dt>
                            <dd>{formatPrice(lineTotal)}</dd>
                          </div>
                        </dl>

                        <div
                          className={styles.quantityGroup}
                          role="group"
                          aria-label={`Cantidad de ${item.name}`}
                        >
                          <button
                            className={styles.quantityButton}
                            type="button"
                            aria-label={`Disminuir cantidad de ${item.name}`}
                            disabled={quantity <= 1}
                            onClick={() => handleChangeQty(item.id, -1)}
                          >
                            <Minus size={17} aria-hidden="true" />
                          </button>
                          <span className={styles.quantityValue} aria-live="polite">
                            {quantity}
                          </span>
                          <button
                            className={styles.quantityButton}
                            type="button"
                            aria-label={`Aumentar cantidad de ${item.name}`}
                            onClick={() => handleChangeQty(item.id, 1)}
                          >
                            <Plus size={17} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            <aside className={styles.summary} aria-labelledby="cart-summary-title">
              <div className={styles.summaryHeader}>
                <h2 id="cart-summary-title" className={styles.summaryTitle}>
                  Resumen
                </h2>
                <span className={styles.summaryBadge}>
                  {totals.units} {totals.units === 1 ? 'item' : 'items'}
                </span>
              </div>

              <div className={styles.summaryRows} aria-live="polite">
                <div className={styles.summaryRow}>
                  <span>Subtotal</span>
                  <strong id="cart-subtotal">{formatPrice(totals.amount)}</strong>
                </div>
                <div className={styles.summaryRow}>
                  <span>Envio</span>
                  <span>A coordinar</span>
                </div>
                <div className={styles.totalRow}>
                  <span>Total</span>
                  <strong id="cart-total">{formatPrice(totals.amount)}</strong>
                </div>
              </div>

              {!businessOpen ? (
                <AsyncStateNotice
                  state="error"
                  message="El local esta cerrado por ahora."
                  className={styles.closedNote}
                />
              ) : null}

              <div className={styles.actions}>
                {isConfirmBlocked ? (
                  <button
                    className={styles.primaryButton}
                    type="button"
                    disabled
                    aria-disabled="true"
                  >
                    Confirmar pedido
                    <ArrowRight size={18} aria-hidden="true" />
                  </button>
                ) : (
                  <a className={styles.primaryLink} href="#confirm">
                    Confirmar pedido
                    <ArrowRight size={18} aria-hidden="true" />
                  </a>
                )}
                <a className={styles.secondaryLink} href="#products">
                  Seguir comprando
                </a>
                <button
                  id="clear-cart-btn"
                  className={styles.clearButton}
                  type="button"
                  onClick={handleClear}
                >
                  Vaciar carrito
                </button>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
