// contact.js — vínculo dinámico a WhatsApp desde /data/estado.json
export async function initContact() {
  const link = document.getElementById("contact-wa");
  if (!link) return;

  try {
    const res = await fetch("/data/estado.json");
    if (!res.ok) throw new Error("estado.json");
    const json = await res.json();
    const num = String(json.whatsAppNumber || "").replace(/[^\d]/g, "");
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

