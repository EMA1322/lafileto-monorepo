// =============================
// 📁 cartService.js
// ✅ Centraliza toda la lógica del carrito
// =============================

import { loadCart, saveCart } from "./helpers.js";

/**
 * ✅ Devuelve el carrito actual desde localStorage
 * @returns {Array} Lista de productos en el carrito
 */
export function getCart() {
    return loadCart();
}

/**
 * ✅ Agrega un producto al carrito
 * - Si ya existe, incrementa la cantidad
 * - Si no existe, lo agrega con quantity = 1
 * @param {Object} product Objeto con {id, name, price, image}
 */
export function addToCart(product) {
    const cart = loadCart();

  // Buscar si el producto ya está en el carrito
    const existingItem = cart.find((item) => item.id === product.id);

    if (existingItem) {
    existingItem.quantity += 1; // Incrementar cantidad
    } else {
    cart.push({ ...product, quantity: 1 });
}

    saveCart(cart);
    updateCartCount();
}

/**
 * ✅ Actualiza la cantidad de un producto
 * - Si qty < 1, elimina el producto
 * @param {string} id ID del producto
 * @param {number} qty Nueva cantidad
 */
export function updateQuantity(id, qty) {
    const cart = loadCart();

    const item = cart.find((item) => item.id === id);
    if (!item) return;

    if (qty < 1) {
    removeFromCart(id);
    return;
    }

    item.quantity = qty;
    saveCart(cart);
    updateCartCount();
}

/**
 * ✅ Elimina un producto del carrito por su ID
 * @param {string} id ID del producto
 */
export function removeFromCart(id) {
    let cart = loadCart();
    cart = cart.filter((item) => item.id !== id);

    saveCart(cart);
    updateCartCount();
}

/**
 * ✅ Vacía todo el carrito
 */
export function clearCart() {
    saveCart([]);
    updateCartCount();
}

/**
 * ✅ Actualiza el contador del carrito en el header
 * - Calcula la suma total de cantidades
 */
export function updateCartCount() {
    const cart = loadCart();
    const countElement = document.getElementById("cart-count");

    if (countElement) {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    countElement.textContent = totalItems;
    }
}
