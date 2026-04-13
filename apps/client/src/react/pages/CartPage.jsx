import { useEffect, useMemo, useState } from 'react';
import { clearCart, getCart, removeFromCart, updateQuantity } from '/src/utils/cartService.js';
import { formatPrice } from '/src/utils/helpers.js';
import { loadCommercialContext } from '/src/utils/commercialContext.js';
import { showSnackbar } from '/src/utils/showSnackbar.js';
import { AsyncStateNotice } from '../components/AsyncStateNotice.jsx';
import '/src/styles/cart.css';

function getSafeCart() {
  const cart = getCart();
  return Array.isArray(cart) ? cart : [];
}

export function CartPage() {
  const [items, setItems] = useState(() => getSafeCart());
  const [statusMessage, setStatusMessage] = useState('');
  const [businessOpen, setBusinessOpen] = useState(true);

  const total = useMemo(() => {
    return items.reduce((acc, item) => acc + Number(item.price || 0) * Number(item.quantity || 0), 0);
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
        setStatusMessage('We are currently closed.');
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

    const nextQty = Math.max(1, Number(item.quantity || 1) + delta);
    updateQuantity(String(id), nextQty);
    setStatusMessage(`Quantity for ${item.name}: ${nextQty}`);
  };

  const handleRemove = (id) => {
    removeFromCart(String(id));
  };

  const handleClear = () => {
    if (!items.length) return;

    const shouldClear = window.confirm('Clear cart?');
    if (!shouldClear) return;

    clearCart();
    setStatusMessage('Cart cleared.');
  };

  const handleConfirm = (event) => {
    if (isConfirmBlocked) {
      event.preventDefault();
      setStatusMessage(confirmBlockedMessage);
      showSnackbar(confirmBlockedMessage);
    }
  };

  const isEmpty = items.length === 0;
  const isConfirmBlocked = isEmpty || !businessOpen;
  const confirmBlockedMessage = isEmpty ? 'Your cart is empty.' : 'We are currently closed.';

  return (
    <main className="cart" aria-labelledby="cart-title">
      <div className="cart__container">
        <header className="cart__header">
          <h1 id="cart-title" className="cart__title">Your cart</h1>
          <p className="cart__subtitle">Review your products before confirming the order.</p>
        </header>

        <div id="cart-status" className="cart__status" role="status" aria-live="polite">{statusMessage}</div>

        <div className="cart__layout">
          <div className="cart__list">
            {isEmpty ? (
              <div id="cart-empty" className="cart__empty">
                <span aria-hidden="true">🛒</span>
                <h2 className="cart__empty-title">Your cart is empty</h2>
                <p className="cart__empty-text">Add products from the menu to continue.</p>
                <a className="btn cart__empty-cta" href="#products">Go to menu</a>
              </div>
            ) : (
              <ul id="cart-items" className="cart__items" aria-busy="false">
                {items.map((item) => {
                  const lineTotal = Number(item.price || 0) * Number(item.quantity || 0);
                  return (
                    <li className="cart__item" key={item.id} data-id={String(item.id)}>
                      <div className="cart__image">
                        <img src={item.image || '/img/hero1.png'} alt={item.name || 'Cart item'} loading="lazy" />
                      </div>

                      <div className="cart__info">
                        <h3 className="cart__name">{item.name}</h3>
                        <div className="cart__price">{formatPrice(item.price)}</div>

                        <div className="cart__controls">
                          <div className="cart__qty-group" role="group" aria-label={`Quantity controls for ${item.name}`}>
                            <button className="cart__qty-btn" type="button" aria-label="Decrease quantity" onClick={() => handleChangeQty(item.id, -1)}>−</button>
                            <span className="cart__qty" aria-live="polite">{item.quantity}</span>
                            <button className="cart__qty-btn" type="button" aria-label="Increase quantity" onClick={() => handleChangeQty(item.id, 1)}>+</button>
                          </div>

                          <button className="cart__remove" type="button" onClick={() => handleRemove(item.id)} aria-label={`Remove ${item.name} from cart`}>
                            Remove
                          </button>
                        </div>

                        <div className="cart__price">Item subtotal: {formatPrice(lineTotal)}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <aside className="cart__summary" aria-label="Order summary">
            <div className="cart__summary-row">
              <span>Subtotal</span>
              <span id="cart-subtotal">{formatPrice(total)}</span>
            </div>
            <div className="cart__summary-row cart__summary-total">
              <span>Total</span>
              <span id="cart-total">{formatPrice(total)}</span>
            </div>

            {!businessOpen ? (
              <AsyncStateNotice state="error" message="We are currently closed." className="cart__closed-note" />
            ) : null}

            <div className="cart__summary-actions">
              <a
                href="#confirm"
                className="btn cart__confirm-btn"
                aria-disabled={isConfirmBlocked}
                onClick={handleConfirm}
                tabIndex={isConfirmBlocked ? -1 : 0}
              >
                Confirm order
              </a>
              <button id="clear-cart-btn" className="btn btn-outline cart__clear-btn" type="button" disabled={isEmpty} onClick={handleClear}>
                Clear cart
              </button>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
