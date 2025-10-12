#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const SUPPORTED_EXT = new Set(['.png', '.jpg', '.jpeg']);

const args = process.argv.slice(2);
const force = args.includes('--force');
const targetArg = args.find((arg) => !arg.startsWith('--')) || 'public/img';
const targetDir = path.resolve(process.cwd(), targetArg);

async function ensureSharp() {
  try {
    const mod = await import('sharp');
    return mod.default || mod;
  } catch (error) {
    console.error('\n[optimize-images] No se pudo cargar "sharp".');
    console.error('Instalá la dependencia en el workspace antes de ejecutar el script:');
    console.error('  pnpm add -Dw sharp');
    console.error('\nDetalle:', error?.message || error);
    process.exitCode = 1;
    return null;
  }
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

async function shouldGenerate(outputPath, sourceStat) {
  if (force) return true;
  try {
    const outStat = await fs.stat(outputPath);
    return outStat.mtimeMs < sourceStat.mtimeMs;
  } catch (error) {
    if (error?.code === 'ENOENT') return true;
    throw error;
  }
}

async function optimizeFile(sharp, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!SUPPORTED_EXT.has(ext)) return { processed: false };

  const sourceStat = await fs.stat(filePath);
  const baseName = path.basename(filePath, ext);
  const dirName = path.dirname(filePath);
  const webpPath = path.join(dirName, `${baseName}.webp`);
  const avifPath = path.join(dirName, `${baseName}.avif`);

  const tasks = [];

  if (await shouldGenerate(webpPath, sourceStat)) {
    tasks.push(
      sharp(filePath)
        .webp({ quality: 80 })
        .toFile(webpPath)
        .then(() => ({ type: 'webp', file: webpPath }))
    );
  }

  if (await shouldGenerate(avifPath, sourceStat)) {
    tasks.push(
      sharp(filePath)
        .avif({ quality: 70 })
        .toFile(avifPath)
        .then(() => ({ type: 'avif', file: avifPath }))
    );
  }

  if (tasks.length === 0) {
    return { processed: false, skipped: true };
  }

  const results = await Promise.allSettled(tasks);
  const generated = [];
  const errors = [];

  for (const res of results) {
    if (res.status === 'fulfilled') {
      generated.push(res.value);
    } else {
      errors.push(res.reason);
    }
  }

  return { processed: true, generated, errors };
}

async function walkAndOptimize(sharp, dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const summary = { files: 0, converted: 0, skipped: 0, errors: [] };

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await walkAndOptimize(sharp, fullPath);
      summary.files += nested.files;
      summary.converted += nested.converted;
      summary.skipped += nested.skipped;
      summary.errors.push(...nested.errors);
      continue;
    }

    summary.files += 1;
    try {
      const result = await optimizeFile(sharp, fullPath);
      if (result.processed) {
        summary.converted += 1;
        for (const out of result.generated) {
          console.log(`✔ ${path.relative(targetDir, fullPath)} → ${out.type.toUpperCase()}`);
        }
        if (result.errors.length > 0) {
          summary.errors.push({ file: fullPath, error: result.errors.map((e) => e?.message || String(e)).join('\n') });
        }
      } else if (result.skipped) {
        summary.skipped += 1;
        console.log(`↻ ${path.relative(targetDir, fullPath)} (sin cambios)`);
      }
    } catch (error) {
      summary.errors.push({ file: fullPath, error: error?.message || String(error) });
      console.error(`✖ Error procesando ${fullPath}:`, error);
    }
  }

  return summary;
}

async function main() {
  if (!(await pathExists(targetDir))) {
    console.error(`[optimize-images] Directorio no encontrado: ${targetDir}`);
    process.exit(1);
    return;
  }

  const sharp = await ensureSharp();
  if (!sharp) return;

  console.log(`→ Optimización de imágenes en: ${targetDir}`);
  const summary = await walkAndOptimize(sharp, targetDir);

  console.log('\nResumen:');
  console.log(`  - Imágenes detectadas: ${summary.files}`);
  console.log(`  - Convertidas (WebP/AVIF): ${summary.converted}`);
  console.log(`  - Sin cambios: ${summary.skipped}`);
  if (summary.errors.length > 0) {
    console.log(`  - Errores: ${summary.errors.length}`);
    for (const item of summary.errors) {
      console.log(`    • ${path.relative(targetDir, item.file)} → ${item.error}`);
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[optimize-images] Error inesperado:', error);
  process.exit(1);
});
