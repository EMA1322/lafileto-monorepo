// ✅ helpers.js – Funciones reutilizables para todo el proyecto
// ------------------------------------------------------------
// Notas de mantenimiento:
// - Se aclaró el contrato de descuentos:
//   • getDiscountedPrice(price, discount) → devuelve el PRECIO FINAL.
//   • applyDiscount(...) se mantiene por compatibilidad (alias).
// - No se altera la UX ni la API pública de este archivo.
// ------------------------------------------------------------

/**
 * Obtiene el estado del negocio desde estado.json
 * @returns {Promise<boolean>} true si está abierto, false si está cerrado
 */
export async function isBusinessOpen() {
  try {
    const res = await fetch("/data/estado.json"); // ✅ Ruta correcta desde public
    if (!res.ok) throw new Error("Error al cargar estado.json");

    const estado = await res.json();
    return estado.open === true; // Devuelve true si está abierto
  } catch (err) {
    console.error("Error al verificar estado del negocio:", err);
    return false; // Por defecto, lo consideramos cerrado
  }
}

/**
 * Formatea precios en ARS con locale es-AR.
 * Mantiene mínimo de 0 decimales (como venías usando).
 * @param {number} price
 * @returns {string}
 */
export function formatPrice(price) {
  return Number(price).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0
  });
}

/**
 * Valida inputs básicos (texto o email).
 * @param {string} value
 * @param {"text"|"email"} [type="text"]
 * @returns {boolean}
 */
export function validateInput(value, type = "text") {
  if (type === "email") {
    // Expresión regular simple para validar formato de email
    return /\S+@\S+\.\S+/.test(value);
  }
  return String(value).trim().length > 0;
}

/**
 * Muestra un loader simple dentro de un contenedor.
 * (Se conserva por compatibilidad; el loader principal del SPA está en renderView)
 * @param {HTMLElement} container
 */
export function showLoader(container) {
  container.innerHTML = `
    <div class="loader" role="status" aria-label="Cargando">
      <span class="visually-hidden">Cargando...</span>
    </div>
  `;
}

/**
 * Muestra un mensaje de error dentro de un contenedor.
 * @param {HTMLElement} container
 * @param {string} [message="Ocurrió un error"]
 */
export function handleError(container, message = "Ocurrió un error") {
  container.innerHTML = `
    <div class="error-message" role="alert">
      <p>⚠️ ${message}</p>
    </div>
  `;
}

// ======================================================
// Descuentos (contrato claro sin romper compatibilidad)
// ======================================================

/**
 * Normaliza un porcentaje de descuento a rango [0, 100].
 * @param {number} discount - Porcentaje de descuento 0–100.
 * @returns {number} - Porcentaje normalizado (0–100).
 */
export function normalizeDiscount(discount) {
  const d = Number(discount);
  if (!Number.isFinite(d)) return 0;
  if (d <= 0) return 0;
  if (d >= 100) return 100;
  return d;
}

/**
 * Calcula el precio final aplicando un descuento porcentual.
 * - No muta el precio original.
 * - Redondea a 2 decimales para evitar errores flotantes.
 * - Si discount es inválido o fuera de rango, se normaliza.
 * @param {number|string} price - Precio base (>= 0).
 * @param {number|string} discount - Descuento porcentual 0–100.
 * @returns {number} - Precio final con descuento aplicado.
 */
export function getDiscountedPrice(price, discount) {
  const p = Math.max(0, Number(price)); // precio no negativo
  const d = normalizeDiscount(discount);

  if (d === 0) return p;

  const final = p * (1 - d / 100);
  return Math.round(final * 100) / 100; // 2 decimales
}

/**
 * @deprecated Usar getDiscountedPrice(price, discount).
 * Alias de compatibilidad: mantiene exactamente el mismo comportamiento.
 * Devuelve el precio final con descuento.
 */
export function applyDiscount(price, discount) {
  return getDiscountedPrice(price, discount);
}

// ======================================================
// Persistencia simple del carrito (LocalStorage)
// ======================================================

/**
 * Carga el carrito desde localStorage, devolviendo un array vacío si no hay datos.
 * @returns {Array}
 */
export function loadCart() {
  const cartData = localStorage.getItem("cart");
  return cartData ? JSON.parse(cartData) : [];
}

/**
 * Guarda el carrito en localStorage como JSON.
 * @param {Array} cart
 */
export function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
}

// ======================================================
// Fetch JSON genérico con manejo de errores
// ======================================================

/**
 * Carga un JSON desde una URL y maneja errores de red.
 * Lanza un error si la respuesta no es exitosa.
 * @param {string} path
 * @returns {Promise<any>}
 */
export async function fetchJSON(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Error al cargar ${path}`);
  }
  return await response.json();
}
