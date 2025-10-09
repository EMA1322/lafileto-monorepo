// footer.js — pequeños inits del pie
export function initFooter() {
  const y = document.getElementById("current-year");
  if (y) y.textContent = String(new Date().getFullYear());
}

