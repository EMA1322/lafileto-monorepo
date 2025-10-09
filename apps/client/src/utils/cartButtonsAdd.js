// =====================================================
// cartButtonsAdd.js — wire genérico para botones "Agregar al carrito"
// =====================================================
import { addToCart } from "/src/utils/cartService.js";
import { showSnackbar } from "/src/utils/showSnackbar.js";

/**
 * Vincula todos los botones que coincidan con el selector.
 * Lee los atributos data-* y agrega el producto al carrito.
 * @param {string} selector - Ej: ".btn-add-to-cart"
 */
export function setupCartButtons(selector = ".btn-add-to-cart") {
  const buttons = document.querySelectorAll(selector);
  if (!buttons.length) return;

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = String(btn.dataset.id || "");
      const name = String(btn.dataset.name || "Producto");
      const price = Number(btn.dataset.price || 0);
      const image = String(btn.dataset.image || "");
      const source = String(btn.dataset.source || "");

      addToCart({ id, name, price, image, source, quantity: 1 });
      showSnackbar(`Agregado al carrito: ${name}`);
    });
  });
}

