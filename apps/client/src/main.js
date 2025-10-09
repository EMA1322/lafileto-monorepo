// ================================
// main.js — boot del SPA
// ================================

// Estilos globales + estilos por vista
import "/src/styles/global.css";
import "/src/styles/header.css";   // << necesario para que se vea el header
import "/src/styles/footer.css";   // << necesario para que se vea el footer




// Router de la SPA
// ⚠️ Ajustá esta ruta si tu router vive en otro lado.
import { initRouter } from "/src/utils/router.js";

// Inits de Header y Footer
import { initHeader } from "/src/components/header/header.js";
import { initFooter } from "/src/components/footer/footer.js";

// Utilidad para cargar un fragmento HTML en un contenedor
async function loadFragment(hostSelector, htmlPath) {
  const host = document.querySelector(hostSelector);
  if (!host) return;

  try {
    const res = await fetch(htmlPath);
    if (!res.ok) throw new Error(`Fetch ${htmlPath} -> ${res.status}`);
    const html = await res.text();
    host.innerHTML = html;
  } catch (err) {
    console.error(`[main] Error cargando fragmento ${htmlPath}:`, err);
  }
}

async function loadHeader() {
  await loadFragment("body > header[role='banner']", "/src/components/header/header.html");
  // ahora sí, el DOM existe:
  initHeader();
}

async function loadFooter() {
  await loadFragment("body > footer[role='contentinfo']", "/src/components/footer/footer.html");
  initFooter();
}

window.addEventListener("DOMContentLoaded", async () => {
  // 1) Inyectar header y footer (en paralelo)
  await Promise.all([loadHeader(), loadFooter()]);

  // 2) Iniciar router (carga dinámica de vistas en #main-content)
  initRouter();
});



