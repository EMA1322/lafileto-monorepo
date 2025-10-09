// =====================================================
// confirm.js — módulo Confirm (SPA)
// - BEM consistente con CSS
// - Sin wait loops
// - WhatsApp centralizado desde /data/estado.json
// - Mensaje robusto (encodeURIComponent)
// - Usa cartService (no accede directo a localStorage)
// - A11y: radios con aria-controls/expanded, address hidden/focus
// =====================================================

// Imports canónicos
import { formatPrice, isBusinessOpen } from "/src/utils/helpers.js";
import { getCart, clearCart } from "/src/utils/cartService.js";
import { showSnackbar } from "/src/utils/showSnackbar.js";

// Estado del módulo
let els = {};
let business = { isOpen: true, whatsAppNumber: "" };

// ================================
// Init
// ================================
export async function initConfirm() {
  // Resolver elementos una sola vez
  els.list = document.getElementById("confirm-order-list");
  els.total = document.getElementById("confirm-total-price");
  els.sendBtn = document.getElementById("confirm-send-btn");
  els.name = document.getElementById("confirm-name");
  els.notes = document.getElementById("confirm-notes");
  els.preview = document.getElementById("confirm-message");
  els.closedNote = document.getElementById("confirm-closed-note");

  // Radios entrega
  els.radioPickup = document.getElementById("delivery-pickup");
  els.radioDelivery = document.getElementById("delivery-delivery");
  els.addressWrapper = document.getElementById("confirm-address-wrapper");
  els.address = document.getElementById("confirm-address");

  if (!els.list || !els.total || !els.sendBtn) {
    console.error("[Confirm] Faltan elementos requeridos en el DOM.");
    return;
  }

  // Estado del negocio (open + WhatsApp centralizado)
  try {
    business = await fetchBusinessConfig();
  } catch {
    // fallback: sólo isOpen por helpers
    try {
      business.isOpen = await isBusinessOpen();
    } catch {}
  }

  // Eventos
  const onDeliveryChange = () => {
    const delivery = getDeliveryMode();
    const isDelivery = delivery === "delivery";
    els.addressWrapper.hidden = !isDelivery;
    els.addressWrapper.setAttribute("aria-hidden", String(!isDelivery));
    els.radioDelivery?.setAttribute("aria-expanded", String(isDelivery));
    els.radioPickup?.setAttribute("aria-expanded", String(!isDelivery));
    if (isDelivery) {
      // foco amable
      setTimeout(() => els.address?.focus(), 0);
    }
    updatePreview();
  };
  els.radioPickup?.addEventListener("change", onDeliveryChange);
  els.radioDelivery?.addEventListener("change", onDeliveryChange);

  els.name?.addEventListener("input", updatePreview);
  els.notes?.addEventListener("input", updatePreview);
  els.address?.addEventListener("input", updatePreview);
  els.sendBtn.addEventListener("click", onSend);

  // Render inicial
  renderOrderSummary();
  updateBusinessUI();
  updatePreview();
}

// ================================
// Business config (centralizado)
// ================================
async function fetchBusinessConfig() {
  const res = await fetch("/data/estado.json");
  if (!res.ok) throw new Error("Error al cargar /data/estado.json");
  const json = await res.json();
  const normalized = String(json.whatsAppNumber || "").replace(/[^\d]/g, "");
  return { isOpen: json.open === true, whatsAppNumber: normalized };
}

// ================================
// Render del resumen
// ================================
function renderOrderSummary() {
  els.list.setAttribute("aria-busy", "true");
  els.list.innerHTML = "";

  const cart = getCartArray();
  if (!cart.length) {
    els.list.innerHTML = `<li class="confirm__item">No hay productos en el carrito.</li>`;
    els.total.textContent = formatPrice(0);
    els.list.setAttribute("aria-busy", "false");
    return;
  }

  const frag = document.createDocumentFragment();
  let total = 0;

  cart.forEach((it) => {
    const qty = Number(it.quantity) || 0;
    const unit = Number(it.price) || 0;
    const line = qty * unit;
    total += line;

    const li = document.createElement("li");
    li.className = "confirm__item";
    li.innerHTML = `
      <div class="confirm__product-image">
        <img src="${it.image || ""}" alt="${escapeHtml(it.name)}" loading="lazy" />
      </div>
      <div>
        <div class="confirm__product-name">${escapeHtml(it.name)}</div>
        <div class="confirm__product-qty">x${qty}</div>
      </div>
      <div class="confirm__product-price">${formatPrice(line)}</div>
    `;
    frag.appendChild(li);
  });

  els.list.appendChild(frag);
  els.total.textContent = formatPrice(total);
  els.list.setAttribute("aria-busy", "false");
}

// ================================
// Vista previa del mensaje
// ================================
function updatePreview() {
  const cart = getCartArray();
  const name = (els.name?.value || "").trim();
  const notes = (els.notes?.value || "").trim();
  const delivery = getDeliveryMode();
  const address = (els.address?.value || "").trim();

  const lines = [];
  lines.push("Hola, quisiera hacer un pedido:");
  if (name) lines.push(`Cliente: ${name}`);

  if (cart.length) {
    lines.push("Detalle:");
    cart.forEach((it) => {
      const qty = Number(it.quantity) || 0;
      const unit = Number(it.price) || 0;
      const line = qty * unit;
      lines.push(`• ${it.name} x${qty} = ${formatPrice(line)}`);
    });
  } else {
    lines.push("Carrito vacío.");
  }

  const totalText = els.total?.textContent || "";
  lines.push(`Total: ${totalText}`);

  if (delivery === "delivery") {
    lines.push(`Entrega: Envío a domicilio`);
    if (address) lines.push(`Dirección: ${address}`);
  } else {
    lines.push(`Entrega: Retiro en el local`);
  }

  if (notes) lines.push(`Notas: ${notes}`);

  els.preview.value = lines.join("\n");
}

// ================================
// Enviar por WhatsApp
// ================================
function onSend() {
  const cart = getCartArray();
  if (!cart.length) {
    showSnackbar("El carrito está vacío.");
    return;
  }
  if (!business.isOpen) {
    showSnackbar("Estamos cerrados en este momento.");
    return;
  }
  if (!business.whatsAppNumber) {
    showSnackbar("No se encontró el número de WhatsApp.");
    return;
  }

  const message = els.preview.value || "";
  const url = `https://wa.me/${business.whatsAppNumber}?text=${encodeURIComponent(message)}`;

  // Abrimos en una nueva pestaña (no bloqueante)
  window.open(url, "_blank", "noopener,noreferrer");

  // Limpieza del carrito (misma UX que tenías)
  clearCart();
  showSnackbar("Pedido enviado. Vaciamos el carrito.");
  // Opcional: volver al home o productos
  // window.location.hash = "#home";
}

// ================================
// Estado negocio
// ================================
function updateBusinessUI() {
  els.sendBtn.disabled = !business.isOpen || getCartArray().length === 0;
  els.closedNote.hidden = business.isOpen;
}

// ================================
// Helpers locales
// ================================
function getDeliveryMode() {
  return els.radioDelivery?.checked ? "delivery" : "pickup";
}

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
