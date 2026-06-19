import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  MapPin,
  MessageCircle,
  Send,
  ShoppingBag,
  StickyNote,
  Store,
  UserRound,
} from 'lucide-react';
import { clearCart, getCart } from '/src/utils/cartService.js';
import { formatPrice } from '/src/utils/helpers.js';
import { loadCommercialContext } from '/src/utils/commercialContext.js';
import { showSnackbar } from '/src/utils/showSnackbar.js';
import { AsyncStateNotice } from '../components/AsyncStateNotice.jsx';
import styles from './ConfirmPage.module.css';

function getSafeCart() {
  const cart = getCart();
  return Array.isArray(cart) ? cart : [];
}

function buildWhatsappMessage({
  items,
  total,
  customerName,
  deliveryMode,
  address,
  notes,
  messageCta,
}) {
  const lines = [messageCta || 'Hola, quisiera hacer un pedido:'];

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

function getCommercialStatusMessage(message) {
  if (!message) return '';

  return message.replace(
    'Commercial information is temporarily unavailable.',
    'No pudimos cargar toda la información comercial.',
  );
}

export function ConfirmPage() {
  const [items, setItems] = useState(() => getSafeCart());
  const [businessOpen, setBusinessOpen] = useState(true);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappMessageCta, setWhatsappMessageCta] = useState('');
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
      messageCta: whatsappMessageCta,
    });
  }, [items, total, customerName, deliveryMode, address, notes, whatsappMessageCta]);

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
      setWhatsappMessageCta(context.whatsappMessageCta || '');

      if (context.errorMessage) {
        setStatusMessage(getCommercialStatusMessage(context.errorMessage));
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
  const itemCountLabel = items.length === 1 ? '1 producto' : `${items.length} productos`;
  const technicalBlockMessage = isEmpty
    ? 'Tu carrito está vacío.'
    : !businessOpen
      ? 'Ahora estamos cerrados.'
      : !whatsappNumber
        ? 'El WhatsApp no está disponible por ahora.'
        : '';

  const handleSend = () => {
    if (isEmpty) {
      const message = 'Tu carrito está vacío.';
      setStatusMessage(message);
      showSnackbar(message);
      return;
    }

    if (!businessOpen) {
      const message = 'Ahora estamos cerrados.';
      setStatusMessage(message);
      showSnackbar(message);
      return;
    }

    if (!whatsappNumber) {
      const message = 'El WhatsApp no está disponible por ahora.';
      setStatusMessage(message);
      showSnackbar(message);
      return;
    }

    if (!hasCustomerName) {
      const message = 'Completá tu nombre para poder preparar el pedido.';
      setStatusMessage(message);
      showSnackbar(message);
      return;
    }

    if (requiresAddress && !hasAddress) {
      const message = 'Completá la dirección para el envío.';
      setStatusMessage(message);
      showSnackbar(message);
      return;
    }

    const encodedMessage = encodeURIComponent(previewMessage);
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    clearCart();
    setStatusMessage('Pedido enviado por WhatsApp. Vaciamos el carrito.');
    showSnackbar('Pedido enviado por WhatsApp.');
  };

  return (
    <main className={styles.page} aria-labelledby="confirm-title">
      <div className={styles.container}>
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>Pedido por WhatsApp</span>
            <h1 id="confirm-title" className={styles.title}>
              Revisá tu pedido.
            </h1>
            <p className={styles.subtitle}>
              Completá tus datos, chequeá el total y mandanos todo por WhatsApp. Te lo preparamos al
              toque.
            </p>
          </div>
          <div className={styles.heroBadge} aria-hidden="true">
            <ShoppingBag size={24} />
            <span>{isEmpty ? 'Sin productos' : itemCountLabel}</span>
          </div>
        </header>

        {technicalBlockMessage ? (
          <AsyncStateNotice
            state="error"
            message={technicalBlockMessage}
            className={styles.status}
          />
        ) : null}

        <div className={styles.layout}>
          <section className={styles.summary} aria-labelledby="confirm-summary-title">
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon} aria-hidden="true">
                <ShoppingBag size={18} />
              </span>
              <div>
                <h2 id="confirm-summary-title" className={styles.sectionTitle}>
                  Resumen del pedido
                </h2>
                <p className={styles.sectionNote}>Revisá cantidades y total antes de enviar.</p>
              </div>
            </div>

            {isEmpty ? (
              <ul id="confirm-order-list" className={styles.list} aria-busy="false">
                <li className={styles.emptyItem}>
                  <strong>Tu carrito está vacío.</strong>
                  <span>Volvé al menú y elegí lo que más te tienta.</span>
                </li>
              </ul>
            ) : (
              <ul id="confirm-order-list" className={styles.list} aria-busy="false">
                {items.map((item) => {
                  const lineTotal = Number(item.price || 0) * Number(item.quantity || 0);
                  return (
                    <li key={item.id} className={styles.item}>
                      <div className={styles.productImage}>
                        <img
                          src={item.image || '/img/hero1.png'}
                          alt={item.name || 'Producto'}
                          width="72"
                          height="72"
                          loading="lazy"
                        />
                      </div>
                      <div className={styles.productCopy}>
                        <div className={styles.productName}>{item.name}</div>
                        <div className={styles.productQty}>{item.quantity} unidad/es</div>
                      </div>
                      <div className={styles.productPrice}>{formatPrice(lineTotal)}</div>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className={styles.totalRow} aria-live="polite">
              <span>Total</span>
              <strong id="confirm-total-price">{formatPrice(total)}</strong>
            </div>
          </section>

          <section className={styles.form} aria-labelledby="confirm-form-title">
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon} aria-hidden="true">
                <UserRound size={18} />
              </span>
              <div>
                <h2 id="confirm-form-title" className={styles.sectionTitle}>
                  Completá tus datos
                </h2>
                <p className={styles.sectionNote}>Así sabemos para quién sale el pedido.</p>
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="confirm-name" className={styles.label}>
                Nombre
              </label>
              <input
                id="confirm-name"
                name="customerName"
                className={styles.input}
                type="text"
                placeholder="Ej.: Ana…"
                autoComplete="name"
                aria-describedby="confirm-name-help"
                required
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
              />
              <p id="confirm-name-help" className={styles.help}>
                Lo usamos para identificar tu pedido cuando nos escribas.
              </p>
            </div>

            <fieldset className={styles.fieldset}>
              <legend className={styles.label}>Cómo lo recibís</legend>
              <div className={styles.radioGroup}>
                <label className={styles.radio}>
                  <input
                    type="radio"
                    name="delivery-method"
                    value="pickup"
                    checked={deliveryMode === 'pickup'}
                    onChange={() => setDeliveryMode('pickup')}
                  />
                  <Store size={17} aria-hidden="true" />
                  Retiro en el local
                </label>

                <label className={styles.radio}>
                  <input
                    type="radio"
                    name="delivery-method"
                    value="delivery"
                    checked={deliveryMode === 'delivery'}
                    onChange={() => setDeliveryMode('delivery')}
                  />
                  <MapPin size={17} aria-hidden="true" />
                  Envío a domicilio
                </label>
              </div>
            </fieldset>

            {requiresAddress ? (
              <div id="confirm-address-wrapper" className={styles.field}>
                <label htmlFor="confirm-address" className={styles.label}>
                  Dirección
                </label>
                <input
                  id="confirm-address"
                  name="deliveryAddress"
                  className={styles.input}
                  type="text"
                  placeholder="Ej.: San Martín 123, 2° B…"
                  autoComplete="street-address"
                  aria-describedby="confirm-address-help"
                  required={requiresAddress}
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                />
                <p id="confirm-address-help" className={styles.help}>
                  Sumá piso, departamento o referencia si hace falta.
                </p>
              </div>
            ) : null}

            <div className={styles.field}>
              <label htmlFor="confirm-notes" className={styles.label}>
                Notas
              </label>
              <div className={styles.textareaWrap}>
                <StickyNote size={17} aria-hidden="true" />
                <textarea
                  id="confirm-notes"
                  name="orderNotes"
                  className={styles.textarea}
                  rows="4"
                  placeholder="Ej.: sin cebolla, pagar con transferencia…"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </div>
              <p className={styles.help}>
                Opcional. Cualquier detalle que ayude a prepararlo mejor.
              </p>
            </div>
          </section>

          <aside className={styles.checkoutPanel} aria-labelledby="confirm-preview-title">
            <section className={styles.preview}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionIcon} aria-hidden="true">
                  <MessageCircle size={18} />
                </span>
                <div>
                  <h2 id="confirm-preview-title" className={styles.sectionTitle}>
                    Mensaje para WhatsApp
                  </h2>
                  <p className={styles.sectionNote}>Esto es lo que vamos a recibir.</p>
                </div>
              </div>
              <textarea
                id="confirm-message"
                className={styles.previewText}
                rows="10"
                readOnly
                value={previewMessage}
                aria-label="Vista previa del mensaje para WhatsApp"
              />
              <p className={styles.hint} role="note">
                Elegí, revisá y mandá tu pedido por WhatsApp.
              </p>
            </section>

            <footer className={styles.footer}>
              <div
                id="confirm-status"
                className={styles.statusLine}
                role="status"
                aria-live="polite"
              >
                {statusMessage}
              </div>

              <div className={styles.actions}>
                <a className={styles.secondaryAction} href="#cart">
                  <ArrowLeft size={18} aria-hidden="true" />
                  Volver al carrito
                </a>
                <button
                  id="confirm-send-btn"
                  className={styles.primaryAction}
                  type="button"
                  onClick={handleSend}
                  disabled={!canSubmit}
                  aria-disabled={!canSubmit}
                >
                  <Send size={18} aria-hidden="true" />
                  Mandá el pedido por WhatsApp
                </button>
              </div>
            </footer>
          </aside>
        </div>
      </div>
    </main>
  );
}
