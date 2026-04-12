// =============================
// 📁 cartService.js
// ✅ Centraliza toda la lógica del carrito
// =============================

import { loadCart, saveCart } from "./helpers.js";

function toSafeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeCartItem(item) {
  if (!item || item.id == null) return null;

  return {
    id: String(item.id),
    name: String(item.name || "Product"),
    price: toSafeNumber(item.price, 0),
    image: item.image || "",
    source: item.source || "products",
    quantity: Math.max(1, Math.trunc(toSafeNumber(item.quantity, 1))),
  };
}

function normalizeCart(cart) {
  if (!Array.isArray(cart)) return [];

  return cart
    .map(normalizeCartItem)
    .filter(Boolean);
}

function persistCart(cart) {
  const normalized = normalizeCart(cart);
  saveCart(normalized);
  updateCartCount();
  document.dispatchEvent(new CustomEvent("cart:updated", { detail: { cart: normalized } }));
  return normalized;
}

/**
 * ✅ Devuelve el carrito actual desde localStorage
 * @returns {Array} Lista de productos en el carrito
 */
export function getCart() {
  const rawCart = loadCart();
  const normalized = normalizeCart(rawCart);

  if (JSON.stringify(rawCart) !== JSON.stringify(normalized)) {
    saveCart(normalized);
  }

  return normalized;
}

/**
 * ✅ Agrega un producto al carrito
 * - Si ya existe, incrementa la cantidad
 * - Si no existe, lo agrega con quantity = 1
 * @param {Object} product Objeto con {id, name, price, image}
 */
export function addToCart(product) {
  const cart = getCart();
  const productId = String(product?.id ?? "");
  if (!productId) return;

  const existingItem = cart.find((item) => item.id === productId);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push(normalizeCartItem({ ...product, id: productId, quantity: 1 }));
  }

  persistCart(cart);
}

/**
 * ✅ Actualiza la cantidad de un producto
 * - Si qty < 1, elimina el producto
 * @param {string} id ID del producto
 * @param {number} qty Nueva cantidad
 */
export function updateQuantity(id, qty) {
  const cart = getCart();
  const productId = String(id || "");
  if (!productId) return;

  const item = cart.find((cartItem) => cartItem.id === productId);
  if (!item) return;

  const nextQty = Math.trunc(toSafeNumber(qty, item.quantity));
  if (nextQty < 1) {
    removeFromCart(productId);
    return;
  }

  item.quantity = nextQty;
  persistCart(cart);
}

/**
 * ✅ Elimina un producto del carrito por su ID
 * @param {string} id ID del producto
 */
export function removeFromCart(id) {
  const productId = String(id || "");
  if (!productId) return;

  const cart = getCart().filter((item) => item.id !== productId);
  persistCart(cart);
}

/**
 * ✅ Vacía todo el carrito
 */
export function clearCart() {
  persistCart([]);
}

/**
 * ✅ Actualiza el contador del carrito en el header
 * - Calcula la suma total de cantidades
 */
export function updateCartCount() {
  const cart = getCart();
  const countElement = document.getElementById("cart-count");

  if (countElement) {
    const totalItems = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    countElement.textContent = String(totalItems);
  }
}
