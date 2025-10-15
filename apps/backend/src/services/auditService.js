// Servicio de auditoría deprecado: mantiene interfaz sin efectos secundarios
export const auditService = {
  // Método legado: registrar eventos ahora es un no-op controlado
  async record() {
    // Auditoría eliminada: devolvemos undefined sin persistir
    return undefined;
  },
  // Método legado: listar eventos retorna arreglo vacío
  async list() {
    // Auditoría eliminada: respondemos colección vacía
    return [];
  }
};
