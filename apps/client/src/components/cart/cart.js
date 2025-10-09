// =====================================================
// cart.js — módulo Cart (SPA)
// - BEM alineado con CSS
// - Sin wait loops, evento delegado, UX mejorada
// - A11y: role="group", aria-labels, aria-busy, mensajes
// =====================================================

// Imports canónicos
import { formatPrice, isBusinessOpen } from "/src/utils/helpers.js";
import {
  getCart,
  updateQuantity,
  removeFromCart,
  clearCart,
} from "/src/utils/cartService.js";
import { showSnackbar } from "/src/utils/showSnackbar.js";

let els = {};
let businessOpen = true;

// ================================
// Init
// ================================
export async function initCart() {
  // Resolvemos elementos una sola vez
  els.items = document.getElementById("cart-items");
  els.empty = document.getElementById("cart-empty");
  els.status = document.getElementById("cart-status");
  els.subtotal = document.getElementById("cart-subtotal");
  els.total = document.getElementById("cart-total");
  els.confirmBtn = document.getElementById("confirm-order-btn");
  els.clearBtn = document.getElementById("clear-cart-btn");
  els.closedNote = document.getElementById("cart-closed-note");

  if (!els.items || !els.subtotal || !els.total || !els.confirmBtn) {
    console.error("[Cart] Faltan elementos requeridos en el DOM.");
    return;
  }

  // Estado del negocio (habilita/inhabilita confirmar)
  try {
    businessOpen = await isBusinessOpen();
  } catch {
    businessOpen = true; // fallback optimista
  }

  // Eventos (delegación)
  els.items.addEventListener("click", onItemsClick);
  els.confirmBtn.addEventListener("click", onConfirm);
  if (els.clearBtn) els.clearBtn.addEventListener("click", onClear);

  // Primer render
  await renderCart();
  updateBusinessUI();
}

// ================================
// Render
// ================================
async function renderCart() {
  els.items.setAttribute("aria-busy", "true");

  const cart = getCartArray();
  els.items.innerHTML = "";

  if (!cart.length) {
    toggleEmpty(true);
    updateTotals(0);
    els.items.setAttribute("aria-busy", "false");
    return;
  }

  toggleEmpty(false);

  const frag = document.createDocumentFragment();

  cart.forEach((item) => {
    const id = String(item.id);
    const li = document.createElement("li");
    li.className = "cart__item";
    li.dataset.id = id;

    li.innerHTML = `
      <div class="cart__image">
        <img src="${item.image || ""}" alt="${escapeHtml(item.name)}" loading="lazy" />
      </div>
      <div class="cart__info">
        <h3 class="cart__name">${escapeHtml(item.name)}</h3>
        <div class="cart__price">${formatPrice(item.price)}</div>

        <div class="cart__controls">
          <div class="cart__qty-group" role="group" aria-label="Cantidad">
            <button class="cart__qty-btn" data-action="dec" aria-label="Disminuir cantidad">−</button>
            <span class="cart__qty" aria-live="polite">${item.quantity}</span>
            <button class="cart__qty-btn" data-action="inc" aria-label="Aumentar cantidad">+</button>
          </div>

          <button class="cart__remove" data-action="remove" aria-label="Quitar ${escapeAttr(item.name)} del carrito">Quitar</button>
        </div>
      </div>
    `;

    frag.appendChild(li);
  });

  els.items.appendChild(frag);

  // Totales
  const subtotal = cart.reduce(
    (acc, it) => acc + Number(it.price) * Number(it.quantity),
    0
  );
  updateTotals(subtotal);

  els.items.setAttribute("aria-busy", "false");
  updateBusinessUI();
}

function updateTotals(subtotal) {
  const finalTotal = Math.round(subtotal * 100) / 100;
  els.subtotal.textContent = formatPrice(finalTotal);
  els.total.textContent = formatPrice(finalTotal);
}

function toggleEmpty(isEmpty) {
  els.empty.hidden = !isEmpty;
  els.confirmBtn.disabled = isEmpty || !businessOpen;
  if (els.clearBtn) els.clearBtn.disabled = isEmpty;
}

// ================================
// Eventos
// ================================
function onItemsClick(e) {
  const btn = e.target.closest("button");
  if (!btn) return;

  const li = btn.closest(".cart__item");
  if (!li) return;

  const id = String(li.dataset.id || "");
  const action = btn.dataset.action;

  if (action === "inc") {
    changeQty(id, +1);
  } else if (action === "dec") {
    changeQty(id, -1);
  } else if (action === "remove") {
    removeItem(id);
  }
}

function onConfirm() {
  const cart = getCartArray();
  if (!cart.length) {
    showSnackbar("El carrito está vacío.");
    return;
  }
  if (!businessOpen) {
    showSnackbar("Estamos cerrados en este momento.");
    return;
  }
  // Navegar a confirmar
  window.location.hash = "#confirm";
}

function onClear() {
  const cart = getCartArray();
  if (!cart.length) return;
  const ok = confirm("¿Vaciar el carrito?");
  if (!ok) return;
  clearCart();
  showSnackbar("Carrito vaciado.");
  renderCart();
}

// ================================
// Acciones
// ================================
function changeQty(id, delta) {
  const cart = getCartArray();
  const item = cart.find((it) => String(it.id) === String(id));
  if (!item) return;

  const next = Math.max(1, Number(item.quantity) + delta);
  updateQuantity(String(id), next);

  // Mensaje suave
  els.status.textContent = `Cantidad de "${item.name}": ${next}`;
  renderCart();
}

function removeItem(id) {
  const cart = getCartArray();
  const item = cart.find((it) => String(it.id) === String(id));
  removeFromCart(String(id));
  showSnackbar(`Quitado: ${item ? item.name : "producto"}.`);
  renderCart();
}

// ================================
// Estado negocio (open/closed)
// ================================
function updateBusinessUI() {
  els.confirmBtn.disabled = !businessOpen || getCartArray().length === 0;
  els.closedNote.hidden = businessOpen;
  if (!businessOpen) {
    els.status.textContent = "Estamos cerrados en este momento.";
  }
}

// ================================
// Utils
// ================================
function getCartArray() {
  const data = getCart ? getCart() : [];
  return Array.isArray(data) ? data : [];
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
function escapeAttr(str) { return escapeHtml(str).replaceAll("`", "&#96;"); }
