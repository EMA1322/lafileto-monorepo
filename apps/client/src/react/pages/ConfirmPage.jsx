import { useEffect, useMemo, useState } from 'react';
import { clearCart, getCart } from '/src/utils/cartService.js';
import { formatPrice } from '/src/utils/helpers.js';
import { loadCommercialContext } from '/src/utils/commercialContext.js';
import { showSnackbar } from '/src/utils/showSnackbar.js';
import { AsyncStateNotice } from '../components/AsyncStateNotice.jsx';
import '/src/styles/confirm.css';

function getSafeCart() {
  const cart = getCart();
  return Array.isArray(cart) ? cart : [];
}

function buildWhatsappMessage({ items, total, customerName, deliveryMode, address, notes }) {
  const lines = ['Hola, quisiera hacer un pedido:'];

  if (customerName) {
    lines.push(`Cliente: ${customerName}`);
  }

  if (items.length > 0) {
    lines.push('Detalle:');
    items.forEach((item) => {
      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item.price || 0);
      const lineTotal = quantity * unitPrice;
      lines.push(`• ${item.name} x${quantity} = ${formatPrice(lineTotal)}`);
    });
  } else {
    lines.push('Carrito vacío.');
  }

  lines.push(`Total: ${formatPrice(total)}`);

  if (deliveryMode === 'delivery') {
    lines.push('Entrega: Envío a domicilio');
    if (address) {
      lines.push(`Dirección: ${address}`);
    }
  } else {
    lines.push('Entrega: Retiro en el local');
  }

  if (notes) {
    lines.push(`Notas: ${notes}`);
  }

  return lines.join('\n');
}

export function ConfirmPage() {
  const [items, setItems] = useState(() => getSafeCart());
  const [businessOpen, setBusinessOpen] = useState(true);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [deliveryMode, setDeliveryMode] = useState('pickup');
  const [address, setAddress] = useState('');

  const isEmpty = items.length === 0;

  const total = useMemo(() => {
    return items.reduce((acc, item) => {
      return acc + Number(item.price || 0) * Number(item.quantity || 0);
    }, 0);
  }, [items]);

  const previewMessage = useMemo(() => {
    return buildWhatsappMessage({
      items,
      total,
      customerName: customerName.trim(),
      deliveryMode,
      address: address.trim(),
      notes: notes.trim(),
    });
  }, [items, total, customerName, deliveryMode, address, notes]);

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

    async function loadCommercialStatus() {
      const context = await loadCommercialContext();
      if (!mounted) return;

      setBusinessOpen(context.businessOpen);
      setWhatsappNumber(context.whatsappNumber);

      if (context.errorMessage) {
        setStatusMessage(context.errorMessage);
      }
    }

    loadCommercialStatus();

    return () => {
      mounted = false;
    };
  }, []);

  const requiresAddress = deliveryMode === 'delivery';
  const hasCustomerName = customerName.trim().length > 0;
  const hasAddress = address.trim().length > 0;
  const isFormValid = hasCustomerName && (!requiresAddress || hasAddress);
  const canSubmit = !isEmpty && businessOpen && Boolean(whatsappNumber) && isFormValid;
  const technicalBlockMessage = isEmpty
    ? 'Your cart is empty.'
    : !businessOpen
      ? 'We are currently closed.'
      : !whatsappNumber
        ? 'WhatsApp number is not available.'
        : '';

  const handleSend = () => {
    if (isEmpty) {
      const message = 'Your cart is empty.';
      setStatusMessage(message);
      showSnackbar(message);
      return;
    }

    if (!businessOpen) {
      const message = 'We are currently closed.';
      setStatusMessage(message);
      showSnackbar(message);
      return;
    }

    if (!whatsappNumber) {
      const message = 'WhatsApp number is not available.';
      setStatusMessage(message);
      showSnackbar(message);
      return;
    }

    if (!hasCustomerName) {
      const message = 'Please enter your name.';
      setStatusMessage(message);
      showSnackbar(message);
      return;
    }

    if (requiresAddress && !hasAddress) {
      const message = 'Please enter your delivery address.';
      setStatusMessage(message);
      showSnackbar(message);
      return;
    }

    const encodedMessage = encodeURIComponent(previewMessage);
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    clearCart();
    setStatusMessage('Order sent via WhatsApp. Cart cleared.');
    showSnackbar('Order sent via WhatsApp.');
  };

  return (
    <main className="confirm" aria-labelledby="confirm-title">
      <div className="confirm__container">
        <header className="confirm__header">
          <h1 id="confirm-title" className="confirm__title">Confirm your order</h1>
          <p className="confirm__subtitle">Review your order details and send it through WhatsApp.</p>
        </header>

        {technicalBlockMessage ? (
          <AsyncStateNotice state="error" message={technicalBlockMessage} className="confirm__status" />
        ) : null}

        <div className="confirm__layout">
          <section className="confirm__summary" aria-labelledby="confirm-summary-title">
            <h2 id="confirm-summary-title" className="confirm__section-title">Order summary</h2>

            {isEmpty ? (
              <ul id="confirm-order-list" className="confirm__list" aria-busy="false">
                <li className="confirm__item">Your cart is empty.</li>
              </ul>
            ) : (
              <ul id="confirm-order-list" className="confirm__list" aria-busy="false">
                {items.map((item) => {
                  const lineTotal = Number(item.price || 0) * Number(item.quantity || 0);
                  return (
                    <li key={item.id} className="confirm__item">
                      <div className="confirm__product-image">
                        <img src={item.image || '/img/hero1.png'} alt={item.name || 'Product'} loading="lazy" />
                      </div>
                      <div>
                        <div className="confirm__product-name">{item.name}</div>
                        <div className="confirm__product-qty">x{item.quantity}</div>
                      </div>
                      <div className="confirm__product-price">{formatPrice(lineTotal)}</div>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="confirm__total-row" aria-live="polite">
              <span>Total</span>
              <strong id="confirm-total-price">{formatPrice(total)}</strong>
            </div>
          </section>

          <section className="confirm__form" aria-labelledby="confirm-form-title">
            <h2 id="confirm-form-title" className="confirm__section-title">Your details</h2>

            <div className="confirm__field">
              <label htmlFor="confirm-name" className="confirm__label">Name</label>
              <input
                id="confirm-name"
                className="confirm__input"
                type="text"
                placeholder="Your name"
                autoComplete="name"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
              />
            </div>

            <fieldset className="confirm__fieldset">
              <legend className="confirm__label">Delivery method</legend>
              <div className="confirm__radio-group">
                <label className="confirm__radio">
                  <input
                    type="radio"
                    name="delivery-method"
                    value="pickup"
                    checked={deliveryMode === 'pickup'}
                    onChange={() => setDeliveryMode('pickup')}
                  />
                  Pick up at store
                </label>

                <label className="confirm__radio">
                  <input
                    type="radio"
                    name="delivery-method"
                    value="delivery"
                    checked={deliveryMode === 'delivery'}
                    onChange={() => setDeliveryMode('delivery')}
                  />
                  Delivery
                </label>
              </div>
            </fieldset>

            {requiresAddress ? (
              <div id="confirm-address-wrapper" className="confirm__field">
                <label htmlFor="confirm-address" className="confirm__label">Address</label>
                <input
                  id="confirm-address"
                  className="confirm__input"
                  type="text"
                  placeholder="Street, number, floor/apartment"
                  autoComplete="street-address"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                />
              </div>
            ) : null}

            <div className="confirm__field">
              <label htmlFor="confirm-notes" className="confirm__label">Notes (optional)</label>
              <textarea
                id="confirm-notes"
                className="confirm__textarea"
                rows="3"
                placeholder="Extra details for your order"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>
          </section>

          <section className="confirm__preview" aria-labelledby="confirm-preview-title">
            <h2 id="confirm-preview-title" className="confirm__section-title">Message preview</h2>
            <textarea id="confirm-message" className="confirm__preview-text" rows="10" readOnly value={previewMessage} />
            <p className="confirm__hint" role="note">This is the message that will be sent to WhatsApp.</p>
          </section>
        </div>

        <footer className="confirm__footer">
          <div id="confirm-status" className="confirm__hint" role="status" aria-live="polite">{statusMessage}</div>

          <div className="confirm__actions">
            <a className="btn btn-outline" href="#cart">Back to cart</a>
            <button
              id="confirm-send-btn"
              className="btn confirm__send-btn"
              type="button"
              onClick={handleSend}
              disabled={!canSubmit}
              aria-disabled={!canSubmit}
            >
              Send via WhatsApp
            </button>
          </div>
        </footer>
      </div>
    </main>
  );
}
