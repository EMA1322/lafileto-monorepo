// ================================
// renderView.js - CLIENTE
// Controla qué vista se carga en <main> según la ruta
// ================================

/**
 * Renderiza el contenido HTML en el contenedor principal <main>
 * - Muestra un loader accesible mientras se realiza el fetch
 * - Mantiene la misma UX (sin cambios de comportamiento)
 * @param {string} path - Ruta del archivo HTML a cargar
 */
export async function renderView(path) {
  const main = document.querySelector("#main-content"); // Contenedor principal

  // ================================
  // Validación: Si no existe el contenedor, log de error
  // ================================
  if (!main) {
    console.error("[renderView] No se encontró #main-content en el DOM.");
    return;
  }

  // ================================
  // Loader accesible (sin CSS inline)
  // - role="status" + aria-live="polite" -> lectores anuncian "Cargando…"
  // - aria-busy en <main> mientras dura la carga
  // ================================
  main.setAttribute("aria-busy", "true");
  main.innerHTML = `
    <div class="app-loader" role="status" aria-live="polite" aria-atomic="true">
      <div class="app-loader__spinner" aria-hidden="true"></div>
      <p class="app-loader__text">Cargando…</p>
    </div>
  `;

  try {
    // ================================
    // Fetch del HTML (sin caché agresiva en dev)
    // ================================
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} al cargar: ${path}`);
    }

    const html = await res.text();

    // ================================
    // Inyecta la vista solicitada
    // (Se mantiene la misma UX: reemplazo directo del contenido)
    // ================================
    main.innerHTML = html;
  } catch (error) {
    // ================================
    // Muestra una UI de error amigable (sin CSS inline)
    // ================================
    console.error("Error al cargar la vista:", error);
    main.innerHTML = `
      <section class="view-error" aria-labelledby="view-error-title">
        <h2 id="view-error-title">¡Ups! Algo salió mal</h2>
        <p>No pudimos cargar el contenido solicitado. Intentá nuevamente.</p>
        <p><small>Detalles: ${error.message}</small></p>
        <a class="btn" href="#home">Volver al inicio</a>
      </section>
    `;
  } finally {
    // ================================
    // A11y: quitar aria-busy cuando finaliza
    // ================================
    main.removeAttribute("aria-busy");
  }
}

