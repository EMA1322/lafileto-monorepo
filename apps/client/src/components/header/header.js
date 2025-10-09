// =====================================================
// header.js — Header global (SPA)
// - Toggle accesible (mobile), overlay y bloqueo de scroll
// - Estado del negocio desde /data/estado.json
// - Contador del carrito (suma de cantidades) vía cartService
// - Cierra al cambiar de ruta / ESC / click en overlay o links
// =====================================================

import { getCart } from "/src/utils/cartService.js";

let els = {};

/** Inicializa el header (llamar una sola vez, p.ej. al boot de la SPA). */
export function initHeader() {
  // Cache de elementos
  els.root = document.querySelector(".header");
  els.overlay = document.getElementById("header-overlay");
  els.toggle = document.getElementById("menu-toggle");
  els.menu = document.getElementById("nav-menu");
  els.cartCount = document.getElementById("cart-count");
  els.business = document.getElementById("business-status");

  if (!els.root || !els.toggle || !els.menu) {
    console.warn("[Header] Missing DOM nodes.");
    return;
  }

  // Toggle menú
  els.toggle.addEventListener("click", toggleMenu);
  els.overlay?.addEventListener("click", closeMenu);
  els.menu.addEventListener("click", (e) => {
    const a = e.target.closest("a[href^='#']");
    if (a) closeMenu();
  });
  window.addEventListener("hashchange", closeMenu);
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });

  // Estado negocio y contador carrito
  updateBusinessStatus();
  updateCartCount();

  // Suscripciones “suaves” para refrescar el contador
  window.addEventListener("storage", (e) => {
    if (e.key === "cart") updateCartCount();
  });
  document.addEventListener("click", (e) => {
    if (e.target.closest(".btn-add-to-cart") || e.target.closest("[data-action='inc']") || e.target.closest("[data-action='dec']") || e.target.closest("[data-action='remove']")) {
      // post-click, damos tiempo a cartService
      setTimeout(updateCartCount, 0);
    }
  });
  // Si otros módulos despachan este evento, también refrescamos
  document.addEventListener("cart:updated", updateCartCount);
}

// --- Estado del negocio (open + label) ---
async function updateBusinessStatus() {
  try {
    const res = await fetch("/data/estado.json");
    if (!res.ok) throw new Error("estado.json");
    const data = await res.json();
    const isOpen = data.open === true;

    els.business.textContent = isOpen ? "Abierto" : "Cerrado";
    els.business.classList.toggle("is-open", isOpen);
    els.business.classList.toggle("is-closed", !isOpen);
  } catch {
    els.business.textContent = "Estado desconocido";
    els.business.classList.remove("is-open", "is-closed");
  }
}

// --- Contador del carrito (suma de cantidades) ---
function updateCartCount() {
  try {
    const cart = Array.isArray(getCart?.()) ? getCart() : [];
    const totalQty = cart.reduce((acc, it) => acc + Number(it.quantity || 0), 0);
    els.cartCount.textContent = String(totalQty);
  } catch {
    els.cartCount.textContent = "0";
  }
}

// --- Menú mobile ---
function toggleMenu() {
  const isOpen = !els.root.classList.contains("is-open");
  els.root.classList.toggle("is-open", isOpen);
  els.toggle.setAttribute("aria-expanded", String(isOpen));
  if (els.overlay) els.overlay.hidden = !isOpen;
  document.body.classList.toggle("body-locked", isOpen);
}
function closeMenu() {
  els.root.classList.remove("is-open");
  els.toggle.setAttribute("aria-expanded", "false");
  if (els.overlay) els.overlay.hidden = true;
  document.body.classList.remove("body-locked");
}
