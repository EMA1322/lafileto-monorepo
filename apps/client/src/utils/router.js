// ================================
// router.js - CLIENTE
// Controla la navegación SPA, carga dinámica de vistas y CSS por ruta
// ================================
import { renderView } from "./renderView.js";

// --------------------------------
// 1) Declaración de rutas (HTML + JS + CSS + init)
//    - No cambia la UX ni nombres ya usados
//    - Los CSS apuntan a /src/styles/*.css (estructura actual)
// --------------------------------
const routes = {
  home: {
    html: "/src/components/home/home.html",
    js: "/src/components/home/home.js",
    css: ["/src/styles/home.css"],
    init: "initHome",
    title: "Inicio",
  },
  products: {
    html: "/src/components/products/products.html",
    js: "/src/components/products/products.js",
    css: ["/src/styles/products.css"],
    init: "initProducts",
    title: "Productos",
  },
  cart: {
    html: "/src/components/cart/cart.html",
    js: "/src/components/cart/cart.js",
    css: ["/src/styles/cart.css"],
    init: "initCart",
    title: "Carrito",
  },
  confirm: {
    html: "/src/components/confirm/confirm.html",
    js: "/src/components/confirm/confirm.js",
    css: ["/src/styles/confirm.css"],
    init: "initConfirm",
    title: "Confirmar pedido",
  },
  contact: {
    html: "/src/components/contact/contact.html",
    js: "/src/components/contact/contact.js",
    css: ["/src/styles/contact.css"], // si no existe, se ignora (no rompe)
    init: "initContact",
    title: "Contacto",
  },
  "404": {
    html: "/src/components/not-found/404.html",
    js: null,
    css: [],
    init: null,
    title: "No encontrado",
  },
};

// --------------------------------
// 2) Globs de módulos JS y CSS (Vite)
//    - CSS: los importamos DINÁMICAMENTE (lazy) por ruta
//    - JS: import dinámico para ejecutar init*
// --------------------------------
const viewJsModules = {
  // Absoluto y relativo para mayor compatibilidad de paths
  ...import.meta.glob('/src/components/home/**/*.js'),
  ...import.meta.glob('/src/components/products/**/*.js'),
  ...import.meta.glob('/src/components/cart/**/*.js'),
  ...import.meta.glob('/src/components/confirm/**/*.js'),
  ...import.meta.glob('/src/components/contact/**/*.js'),
  ...import.meta.glob('../components/home/**/*.js'),
  ...import.meta.glob('../components/products/**/*.js'),
  ...import.meta.glob('../components/cart/**/*.js'),
  ...import.meta.glob('../components/confirm/**/*.js'),
  ...import.meta.glob('../components/contact/**/*.js'),
};

const routeCssModules = {
  ...import.meta.glob('/src/styles/home.css'),
  ...import.meta.glob('/src/styles/products.css'),
  ...import.meta.glob('/src/styles/cart.css'),
  ...import.meta.glob('/src/styles/confirm.css'),
  ...import.meta.glob('/src/styles/contact.css'),
  ...import.meta.glob('../styles/home.css'),
  ...import.meta.glob('../styles/products.css'),
  ...import.meta.glob('../styles/cart.css'),
  ...import.meta.glob('../styles/confirm.css'),
  ...import.meta.glob('../styles/contact.css'),
  // si en el futuro movés CSS a cada componente:
  // ...import.meta.glob("/src/components/**/**.css"),
};

// --------------------------------
// 3) Utilidades de ruteo
// --------------------------------
function getRouteKeyFromHash() {
  const hash = (location.hash || "#home").replace("#", "").trim();
  return hash === "" ? "home" : hash;
}

function getRouteConfig(key) {
  return routes[key] || routes["404"];
}

async function loadRouteCss(cssList = []) {
  // Lazy-once: se importan la primera vez; Vite inyecta <style> y cachea
  for (const href of cssList) {
    const loader =
      routeCssModules[href] ||
      routeCssModules[href.replace("/src/", "../")];

    if (loader) {
      await loader(); // <- importa el CSS y lo inserta en el DOM
    } else {
      // Si el CSS no está en el glob (no existe), no rompemos la navegación
      console.warn("[router] CSS no encontrado en glob:", href);
    }
  }
}

async function runRouteInit(jsPath, initName) {
  if (!jsPath || !initName) return;

  const loader =
    viewJsModules[jsPath] || viewJsModules[jsPath.replace("/src/", "../")];

  if (!loader) {
    console.warn("[router] Módulo JS no encontrado en glob:", jsPath);
    return;
  }

  const mod = await loader().catch((err) => {
    console.error("[router] Error importando módulo:", jsPath, err);
    return null;
  });
  if (!mod) return;

  const initFn = mod[initName];
  if (typeof initFn === "function") {
    await initFn();
  } else {
    console.warn(`[router] La función ${initName} no existe en ${jsPath}`);
  }
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// --------------------------------
// 4) Navegación principal
// --------------------------------
async function handleRouteChange() {
  const key = getRouteKeyFromHash();
  const route = getRouteConfig(key);

  // Opcional: título de documento (no afecta UX si no querés)
  if (route.title) {
    document.title = `La Fileto | ${route.title}`;
  }

  try {
    // 1) Cargar CSS de la vista (lazy)
    await loadRouteCss(route.css);

    // 2) Renderizar HTML de la vista en <main>
    await renderView(route.html);

    // 3) Importar módulo JS y ejecutar init*
    await runRouteInit(route.js, route.init);

    // 4) UX: scroll al top tras navegar
    scrollToTop();
  } catch (err) {
    console.error("[router] Error al navegar:", err);
    // Fallback mínimo en caso de error (sin estilos inline)
    const main = document.querySelector("#main-content");
    if (main) {
      main.innerHTML = `
        <section class="view-error" aria-labelledby="view-error-title">
          <h2 id="view-error-title">¡Ups! Ocurrió un error</h2>
          <p>No se pudo cargar la vista solicitada.</p>
          <a class="btn" href="#home">Ir al inicio</a>
        </section>
      `;
    }
  }
}

// --------------------------------
// 5) Inicialización del router
// --------------------------------
export function initRouter() {
  window.addEventListener("hashchange", handleRouteChange, { passive: true });
  // Si preferís iniciar explícitamente desde main.js después de montar header/footer:
  // podés llamar a handleRouteChange() desde allí.
  handleRouteChange();
}
