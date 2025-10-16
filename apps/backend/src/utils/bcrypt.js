// Helper para cargar bcryptjs on-demand y compartir hash/compare
// Comentarios en español para respetar la guía del proyecto.

let bcryptModulePromise;

async function loadBcrypt() {
  if (!bcryptModulePromise) {
    bcryptModulePromise = import('bcryptjs')
      .then((mod) => mod.default || mod)
      .catch((error) => {
        error.message = 'Missing dependency bcryptjs: run "pnpm install" in apps/backend.';
        throw error;
      });
  }
  return bcryptModulePromise;
}

export async function hashPassword(plain) {
  const bcrypt = await loadBcrypt();
  return bcrypt.hashSync(plain, 10);
}

export async function comparePassword(plain, hash) {
  const bcrypt = await loadBcrypt();
  return bcrypt.compareSync(plain, hash);
}

export { loadBcrypt as getBcrypt };
