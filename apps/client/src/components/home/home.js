// ================================
// home.js - Módulo HOME (SPA)
// ================================

// ===== Imports canónicos (Vite) =====
import productsData from "/src/data/products.json";
import { formatPrice, applyDiscount } from "/src/utils/helpers.js";
import { setupCartButtons } from "/src/utils/cartButtonsAdd.js";
import { showSnackbar } from "/src/utils/showSnackbar.js";

import Swiper from "swiper/bundle";
import "swiper/css/bundle";

// --- Parallax lifecycle (scope del módulo Home) ---
let heroImgRef = null;
let onScrollRef = null;
let onHashChangeRef = null;
let ticking = false; // evita pedir múltiples rAF simultáneos

// ================================
// Inicializa el módulo Home
// ================================
export async function initHome() {
  const container = document.querySelector("#main-content");
  if (!container) return;

  // Animaciones y eventos base
  initHeroAnimations();
  attachTeardownOnLeave();
  setupHomeEvents();

  // WhatsApp centralizado (estado del negocio)
  try {
    const { isOpen, whatsAppNumber } = await fetchBusinessConfig();
    updateWhatsAppLinks({ isOpen, whatsAppNumber });
  } catch (err) {
    console.warn("No se pudo cargar configuración de negocio:", err);
  }

  // ✅ Montar carrusel DIRECTAMENTE (sin wait loops)
  const mounted = renderOffersCarousel();
  if (!mounted) {
    console.warn("⚠ No se encontró #offers-carousel en el DOM.");
  }
}

// ================================
// Animación Hero (parallax con rAF + cleanup)
// ================================
function initHeroAnimations() {
  // Seleccionamos la imagen del Hero (si existe en la vista)
  heroImgRef = document.querySelector(".home__hero-image img");
  if (!heroImgRef) return;

  // Clase opcional al cargar
  heroImgRef.addEventListener("load", () => {
    heroImgRef.classList.add("loaded");
  });

  // Aplica la transformación (parallax)
  const applyParallax = () => {
    if (!heroImgRef) return; // por si se desmontó
    const y = window.scrollY || 0;
    heroImgRef.style.transform = `translateY(${y * 0.4}px) scale(1.1)`;
    ticking = false;
  };

  // Listener de scroll con rAF (mejor rendimiento)
  onScrollRef = () => {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(applyParallax);
    }
  };

  window.addEventListener("scroll", onScrollRef, { passive: true });
  applyParallax(); // primer render
}

// Limpia listeners globales al abandonar Home
function teardownHome() {
  if (onScrollRef) {
    window.removeEventListener("scroll", onScrollRef);
    onScrollRef = null;
  }
  heroImgRef = null;
  ticking = false;
}

// Programa la limpieza al salir de #home
function attachTeardownOnLeave() {
  if (onHashChangeRef) {
    window.removeEventListener("hashchange", onHashChangeRef);
    onHashChangeRef = null;
  }
  onHashChangeRef = () => {
    const next = (location.hash || "#home").replace("#", "") || "home";
    if (next !== "home") {
      teardownHome();
      window.removeEventListener("hashchange", onHashChangeRef);
      onHashChangeRef = null;
    }
  };
  window.addEventListener("hashchange", onHashChangeRef, { passive: true });
}

// ================================
// Eventos CTA principales (sin WhatsApp hardcodeado)
// ================================
function setupHomeEvents() {
  // Botón principal: Ver Menú
  const mainCTA = document.querySelector(".home__hero-btn");
  if (mainCTA) {
    mainCTA.addEventListener("click", () => {
      window.location.hash = "#products";
    });
  }

  // CTA secundaria: Ver Horarios / Contacto (se mantiene)
  const scheduleCTA = document.querySelector(".btn-outline[href^='#contact']");
  if (scheduleCTA) {
    scheduleCTA.addEventListener("click", () => {
      window.location.hash = "#contact";
    });
  }
}

// ================================
// Config de negocio (open + WhatsApp)
// ================================
async function fetchBusinessConfig() {
  // /public/data/estado.json se sirve como /data/estado.json
  const res = await fetch("/data/estado.json");
  if (!res.ok) throw new Error("Error al cargar /data/estado.json");
  const json = await res.json();

  // Normalizamos número a dígitos (wa.me exige sin + ni espacios)
  const normalized = String(json.whatsAppNumber || "").replace(/[^\d]/g, "");

  return {
    isOpen: json.open === true,
    whatsAppNumber: normalized,
  };
}

function updateWhatsAppLinks({ isOpen, whatsAppNumber }) {
  const scope = document.querySelector("#main-content");
  if (!scope) return;

  const links = scope.querySelectorAll(
    "a.home__whatsapp-btn, a[href*='wa.me'], a[data-whatsapp]"
  );

  links.forEach((a) => {
    if (whatsAppNumber) {
      a.href = `https://wa.me/${whatsAppNumber}`;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    }
    if (!isOpen) {
      a.setAttribute("aria-disabled", "true");
      a.addEventListener(
        "click",
        (ev) => {
          ev.preventDefault();
          showSnackbar("Estamos cerrados en este momento.");
        },
        false
      );
    }
  });
}

// ================================
// Renderiza carrusel dinámico de ofertas (SIN waits)
// ================================
function renderOffersCarousel() {
  const container = document.getElementById("offers-carousel");
  if (!container) return false;

  // Estructura base para Swiper
  container.innerHTML = `
    <div class="swiper-wrapper"></div>
    <div class="swiper-button-prev"></div>
    <div class="swiper-button-next"></div>
    <div class="swiper-pagination"></div>
  `;

  const wrapper = container.querySelector(".swiper-wrapper");

  // Filtrar ofertas
  const offers = productsData.filter((item) => item.isOffer === true);

  // Renderizar slides
  offers.forEach((offer) => {
    const discountedPrice = applyDiscount(offer.price, offer.discount);
    const slide = document.createElement("div");
    slide.classList.add("swiper-slide", "home__offer-slide");
    slide.innerHTML = `
      <article class="home__offer-card">
        <div class="home__offer-badge">
          <span class="home__offer-tag">OFERTA</span>
          <span class="home__offer-timer">¡Solo por tiempo limitado!</span>
        </div>
        <div class="home__offer-image">
          <img src="${offer.image}" alt="${offer.name}" loading="lazy">
        </div>
        <div class="home__offer-info">
          <h3 class="home__offer-title">${offer.name}</h3>
          <div class="home__offer-price">
            <span class="home__offer-old-price">${formatPrice(offer.price)}</span>
            <span class="home__offer-discounted">${formatPrice(discountedPrice)}</span>
            <span class="home__offer-discount-percent">-${offer.discount}%</span>
          </div>
        </div>
        <button class="btn-add-to-cart"
          data-id="${offer.id}"
          data-name="${offer.name}"
          data-price="${discountedPrice}"
          data-image="${offer.image}"
          data-source="offers">
          Agregar al carrito
        </button>
      </article>
    `;
    wrapper.appendChild(slide);
  });

  // Inicializar Swiper (spaceBetween controla el gap; no tocar .swiper-wrapper en CSS)
  const swiper = new Swiper(container, {
    slidesPerView: 1,
    spaceBetween: 20,
    autoplay: { delay: 3000, disableOnInteraction: false },
    pagination: { el: ".swiper-pagination", clickable: true },
    navigation: { nextEl: ".swiper-button-next", prevEl: ".swiper-button-prev" },
    breakpoints: {
      640: { slidesPerView: 2 },
      1024: { slidesPerView: 3 },
    },
  });

  // Conectar botones con carrito
  setupCartButtons(".btn-add-to-cart");

  return true;
}
