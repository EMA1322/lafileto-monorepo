import { formatPrice, applyDiscount } from "/src/utils/helpers.js";
import { setupCartButtons } from "/src/utils/cartButtonsAdd.js";
import { showSnackbar } from "/src/utils/showSnackbar.js";
import { fetchBusinessStatus, fetchCommercialConfig, fetchPublicOffers } from "/src/api/public.js";

import Swiper from "swiper/bundle";
import "swiper/css/bundle";

let heroImgRef = null;
let onScrollRef = null;
let onHashChangeRef = null;
let ticking = false;

export async function initHome() {
  const container = document.querySelector("#main-content");
  if (!container) return;

  initHeroAnimations();
  attachTeardownOnLeave();
  setupHomeEvents();

  try {
    const [businessStatus, commercialConfig] = await Promise.all([
      fetchBusinessStatus(),
      fetchCommercialConfig()
    ]);

    updateWhatsAppLinks({
      isOpen: businessStatus.isOpen === true,
      whatsAppNumber: commercialConfig?.whatsapp?.number || ""
    });
  } catch (err) {
    console.warn("No se pudo cargar configuración de negocio:", err);
  }

  const mounted = await renderOffersCarousel();
  if (!mounted) {
    console.warn("⚠ No se encontró #offers-carousel en el DOM.");
  }
}

function initHeroAnimations() {
  heroImgRef = document.querySelector(".home__hero-image img");
  if (!heroImgRef) return;

  heroImgRef.addEventListener("load", () => {
    heroImgRef.classList.add("loaded");
  });

  const applyParallax = () => {
    if (!heroImgRef) return;
    const y = window.scrollY || 0;
    heroImgRef.style.transform = `translateY(${y * 0.4}px) scale(1.1)`;
    ticking = false;
  };

  onScrollRef = () => {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(applyParallax);
    }
  };

  window.addEventListener("scroll", onScrollRef, { passive: true });
  applyParallax();
}

function teardownHome() {
  if (onScrollRef) {
    window.removeEventListener("scroll", onScrollRef);
    onScrollRef = null;
  }
  heroImgRef = null;
  ticking = false;
}

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

function setupHomeEvents() {
  const mainCTA = document.querySelector(".home__hero-btn");
  if (mainCTA) {
    mainCTA.addEventListener("click", () => {
      window.location.hash = "#products";
    });
  }

  const scheduleCTA = document.querySelector(".btn-outline[href^='#contact']");
  if (scheduleCTA) {
    scheduleCTA.addEventListener("click", () => {
      window.location.hash = "#contact";
    });
  }
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

async function renderOffersCarousel() {
  const container = document.getElementById("offers-carousel");
  if (!container) return false;

  container.innerHTML = `
    <div class="swiper-wrapper"></div>
    <div class="swiper-button-prev"></div>
    <div class="swiper-button-next"></div>
    <div class="swiper-pagination"></div>
  `;

  const wrapper = container.querySelector(".swiper-wrapper");

  let offers = [];
  try {
    offers = await fetchPublicOffers();
  } catch (error) {
    console.error("No se pudieron cargar las ofertas:", error);
  }

  offers.forEach((offer) => {
    const product = offer.product || {};
    const discountedPrice = applyDiscount(product.price || 0, offer.discountPercent || 0);
    const slide = document.createElement("div");
    slide.classList.add("swiper-slide", "home__offer-slide");
    slide.innerHTML = `
      <article class="home__offer-card">
        <div class="home__offer-badge">
          <span class="home__offer-tag">OFERTA</span>
          <span class="home__offer-timer">¡Solo por tiempo limitado!</span>
        </div>
        <div class="home__offer-image">
          <img src="${product.imageUrl || ""}" alt="${product.name || "Oferta"}" loading="lazy">
        </div>
        <div class="home__offer-info">
          <h3 class="home__offer-title">${product.name || "Oferta"}</h3>
          <div class="home__offer-price">
            <span class="home__offer-old-price">${formatPrice(product.price || 0)}</span>
            <span class="home__offer-discounted">${formatPrice(discountedPrice)}</span>
            <span class="home__offer-discount-percent">-${offer.discountPercent || 0}%</span>
          </div>
        </div>
        <button class="btn-add-to-cart"
          data-id="${product.id || offer.id}"
          data-name="${product.name || "Oferta"}"
          data-price="${discountedPrice}"
          data-image="${product.imageUrl || ""}"
          data-source="offers">
          Agregar al carrito
        </button>
      </article>
    `;
    wrapper.appendChild(slide);
  });

  new Swiper(container, {
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

  setupCartButtons(".btn-add-to-cart");

  return true;
}
