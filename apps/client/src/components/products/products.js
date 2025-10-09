// =====================================================
// products.js — módulo Products (SPA)
// - Refs A–F: imports arriba, sin waits, precio final si oferta,
//   compat imageUrl/image, debounce de búsqueda, BEM fino.
// =====================================================

// A) Imports canónicos (Vite)
import productsData from "/src/data/products.json";
import { formatPrice, getDiscountedPrice } from "/src/utils/helpers.js";
import { setupCartButtons } from "/src/utils/cartButtonsAdd.js";
import { fetchPublicCategories } from "/src/api/public.js";
import { showSnackbar } from "/src/utils/showSnackbar.js";

// Estado interno (filtro / orden / vista)
let state = {
  query: "",
  sort: "name-asc",
  categoryId: null,   // canónico
  categoryName: "all", // compat legado (mock por nombre)
  view: "grid"        // "grid" | "list"
};

// Referencias a nodos (se resuelven una vez)
let els = {};

// =====================================================
// Init
// =====================================================
export async function initProducts() {
  // Resolver elementos de la vista (una sola vez)
  els.grid = document.getElementById("products-grid");
  els.search = document.getElementById("search-input");
  els.sort = document.getElementById("sort-select");
  els.btnGrid = document.getElementById("btn-grid");
  els.btnList = document.getElementById("btn-list");
  els.categoryList = document.getElementById("category-list");

  if (!els.grid || !els.search || !els.sort || !els.btnGrid || !els.btnList || !els.categoryList) {
    console.error("[Products] Faltan elementos requeridos en el DOM");
    return;
  }

  // Cargar categorías desde API (si falla, seguimos con 'Todas')
  try {
    await renderCategories();
  } catch (e) {
    console.warn("[Products] No se pudieron cargar categorías:", e);
  }

  // Wire de eventos (con debounce en búsqueda)
  els.search.addEventListener("input", debounce((e) => {
    state.query = e.target.value.trim().toLowerCase();
    renderProducts();
  }, 200));

  els.sort.addEventListener("change", () => {
    state.sort = els.sort.value;
    renderProducts();
  });

  els.btnGrid.addEventListener("click", () => setView("grid"));
  els.btnList.addEventListener("click", () => setView("list"));

  // Render inicial
  renderProducts();
}

// =====================================================
// Categorías
// =====================================================
async function renderCategories() {
  const cats = await fetchPublicCategories({ page: 1, pageSize: 100 });
  // Comenzamos por "Todas"
  const frag = document.createDocumentFragment();

  // Botón "Todas" (activa por defecto)
  const btnAll = createCategoryButton({ id: null, name: "Todas" }, true);
  frag.appendChild(btnAll);

  // Resto de categorías activas
  (cats || []).forEach((c) => {
    frag.appendChild(createCategoryButton(c, false));
  });

  els.categoryList.innerHTML = "";
  els.categoryList.appendChild(frag);
}

function createCategoryButton(category, isActive) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "products__category-btn" + (isActive ? " is-active" : "");
  btn.textContent = category.name;
  btn.setAttribute("role", "listitem");
  btn.dataset.categoryId = category.id ?? "";
  btn.dataset.categoryName = (category.name || "").toLowerCase();

  btn.addEventListener("click", () => {
    // Toggle activos
    els.categoryList.querySelectorAll(".products__category-btn.is-active")
      .forEach(el => el.classList.remove("is-active"));
    btn.classList.add("is-active");

    // Guardamos estado (id si existe; sino usamos nombre legacy)
    state.categoryId = category.id ?? null;
    state.categoryName = (category.name || "all").toLowerCase();

    renderProducts();
  });

  return btn;
}

// =====================================================
// Renderizado de productos
// =====================================================
function renderProducts() {
  if (!els.grid) return;

  els.grid.setAttribute("aria-busy", "true");

  // Base: mock local
  let list = Array.isArray(productsData) ? productsData.slice() : [];

  // Filtro por búsqueda (nombre)
  if (state.query) {
    list = list.filter((p) =>
      String(p.name || "").toLowerCase().includes(state.query)
    );
  }

  // Filtro por categoría (preferimos categoryId; fallback a nombre)
  if (state.categoryId != null) {
    list = list.filter((p) => p.categoryId === state.categoryId);
  } else if (state.categoryName && state.categoryName !== "todas" && state.categoryName !== "all") {
    list = list.filter((p) => String(p.category || "").toLowerCase() === state.categoryName);
  }

  // Orden
  sortProducts(list, state.sort);

  // Render
  els.grid.classList.toggle("list-view", state.view === "list");
  els.grid.innerHTML = "";

  if (!list.length) {
    els.grid.innerHTML = `
      <div class="products__empty" role="status">
        No hay productos para mostrar con los filtros seleccionados.
      </div>
    `;
    els.grid.setAttribute("aria-busy", "false");
    return;
  }

  const frag = document.createDocumentFragment();

  list.forEach((p) => {
    const imageSrc = p.imageUrl ?? p.image ?? ""; // D) compat imageUrl/image
    const hasDiscount = Number(p.discount) > 0 && (p.isOffer === true || p.isOffer === "true");
    const finalPrice = hasDiscount ? getDiscountedPrice(p.price, p.discount) : Number(p.price);

    const card = document.createElement("article");
    card.className = "products-card";
    card.innerHTML = `
      <div class="products-card__image">
        <img src="${imageSrc}" alt="${escapeHtml(p.name)}" loading="lazy" />
      </div>

      <div class="products-card__info">
        <h3 class="products-card__title">${escapeHtml(p.name)}</h3>
        ${p.description ? `<p class="products-card__description">${escapeHtml(p.description)}</p>` : ""}
      </div>

      <div class="products-card__price">
        ${hasDiscount ? `<span class="products-card__price-old">${formatPrice(p.price)}</span>` : ""}
        <span class="products-card__price-final">${formatPrice(finalPrice)}</span>
        ${hasDiscount ? `<span class="products-card__badge">-${Number(p.discount)}%</span>` : ""}
      </div>

      <div class="products-card__actions">
        <button
          class="btn products-card__add btn-add-to-cart"
          data-id="${p.id}"
          data-name="${escapeAttr(p.name)}"
          data-price="${finalPrice}"
          data-image="${imageSrc}"
          data-source="products"
          type="button"
        >
          Agregar al carrito
        </button>
      </div>
    `;

    frag.appendChild(card);
  });

  els.grid.appendChild(frag);
  els.grid.setAttribute("aria-busy", "false");

  // Conectar botones al carrito
  setupCartButtons(".btn-add-to-cart");
}

// Ordenadores
function sortProducts(list, sortKey) {
  switch (sortKey) {
    case "name-asc":
      list.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "es", { sensitivity: "base" }));
      break;
    case "price-asc":
      list.sort((a, b) => Number(a.price) - Number(b.price));
      break;
    case "price-desc":
      list.sort((a, b) => Number(b.price) - Number(a.price));
      break;
    case "createdAt-desc":
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      break;
    default:
      break;
  }
}

// =====================================================
// Vista: grid/list
// =====================================================
function setView(view) {
  state.view = view === "list" ? "list" : "grid";

  els.btnGrid.classList.toggle("is-active", state.view === "grid");
  els.btnGrid.setAttribute("aria-pressed", String(state.view === "grid"));

  els.btnList.classList.toggle("is-active", state.view === "list");
  els.btnList.setAttribute("aria-pressed", String(state.view === "list"));

  renderProducts();
}

// =====================================================
// Utils locales
// =====================================================
function debounce(fn, delay = 200) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
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
