export function escapeHTML(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function mapErrorToMessage(err, fallback = "Ocurrió un error.") {
  const code = err?.code || "";
  if (code === "VALIDATION_ERROR") return "Revisá los datos: hay campos inválidos.";
  if (code === "AUTH_REQUIRED" || code === "AUTH_INVALID") return "Iniciá sesión / Tu sesión expiró.";
  if (code === "PERMISSION_DENIED") return "No tenés permisos para esta acción.";
  if (code === "RESOURCE_NOT_FOUND") return "El recurso no existe o fue eliminado.";
  if (code === "CONFLICT" || code === "RESOURCE_CONFLICT") return "Operación en conflicto. Revisá los datos.";
  if (code === "ROLE_IN_USE") return "No se puede eliminar: hay usuarios asignados a este rol.";
  if (code === "RATE_LIMITED") return "Demasiadas solicitudes. Probá en unos minutos.";
  return err?.message || fallback;
}
