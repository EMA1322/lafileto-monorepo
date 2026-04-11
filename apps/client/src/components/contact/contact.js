import { fetchCommercialConfig } from "/src/api/public.js";

export async function initContact() {
  const link = document.getElementById("contact-wa");
  if (!link) return;

  try {
    const data = await fetchCommercialConfig();
    const num = String(data?.whatsapp?.number || "").replace(/[^\d]/g, "");
    if (num) {
      link.href = `https://wa.me/${num}`;
      link.textContent = `+${num}`;
    } else {
      link.textContent = "No disponible";
      link.removeAttribute("href");
    }
  } catch {
    link.textContent = "No disponible";
    link.removeAttribute("href");
  }
}
