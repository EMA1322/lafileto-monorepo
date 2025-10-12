import fs from 'node:fs/promises';
import path from 'node:path';
import { brotliCompressSync, gzipSync } from 'node:zlib';

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value < 10 && exponent > 0 ? 1 : 0)} ${units[exponent]}`;
}

function createHtmlReport(title, rows) {
  const tableRows = rows
    .map((row) => {
      const gzipCell = row.gzipSize != null ? `<td>${formatBytes(row.gzipSize)}</td>` : '';
      const brotliCell = row.brotliSize != null ? `<td>${formatBytes(row.brotliSize)}</td>` : '';
      return `
        <tr>
          <td>${row.fileName}</td>
          <td>${row.type}</td>
          <td>${formatBytes(row.size)}</td>
          ${gzipCell}
          ${brotliCell}
        </tr>`;
    })
    .join('');

  const gzipHeader = rows.some((row) => row.gzipSize != null) ? '<th>gzip</th>' : '';
  const brotliHeader = rows.some((row) => row.brotliSize != null) ? '<th>brotli</th>' : '';

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 2rem; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #ccc; padding: 0.5rem 0.75rem; text-align: left; }
      th { background: #f7f7f7; }
      tbody tr:nth-child(even) { background: #fafafa; }
      caption { font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem; text-align: left; }
    </style>
  </head>
  <body>
    <table>
      <caption>${title}</caption>
      <thead>
        <tr>
          <th>Archivo</th>
          <th>Tipo</th>
          <th>Peso</th>
          ${gzipHeader}
          ${brotliHeader}
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  </body>
</html>`;
}

function computeSize(payload) {
  if (payload == null) return 0;
  if (typeof payload === 'string') return Buffer.byteLength(payload);
  if (payload instanceof Uint8Array) return payload.byteLength;
  return Buffer.byteLength(String(payload));
}

function maybeCompress(enabled, payload, compressor) {
  if (!enabled) return undefined;
  try {
    return compressor(typeof payload === 'string' ? Buffer.from(payload) : Buffer.from(payload || ''))?.length;
  } catch {
    return undefined;
  }
}

export function visualizer(options = {}) {
  const {
    filename = 'dist/stats.html',
    json = false,
    template = 'table',
    gzipSize = true,
    brotliSize = false,
    open = false,
  } = options;

  const resolvedFilename = path.isAbsolute(filename)
    ? filename
    : path.join(process.cwd(), filename);

  return {
    name: 'lafileto-visualizer',
    async generateBundle(_output, bundle) {
      const records = [];

      for (const [fileName, chunk] of Object.entries(bundle)) {
        const payload = chunk.type === 'chunk' ? chunk.code : chunk.source;
        const size = computeSize(payload);
        const gzip = maybeCompress(gzipSize, payload, gzipSync);
        const brotli = maybeCompress(brotliSize, payload, brotliCompressSync);

        records.push({
          fileName,
          type: chunk.type,
          size,
          gzipSize: gzip,
          brotliSize: brotli,
        });
      }

      const dir = path.dirname(resolvedFilename);
      await fs.mkdir(dir, { recursive: true });

      const title = 'Visualización de bundle';
      if (json) {
        const jsonPath = resolvedFilename.replace(/\.html?$/i, '.json');
        await fs.writeFile(jsonPath, JSON.stringify({ meta: { template }, files: records }, null, 2), 'utf8');
      }

      const html = createHtmlReport(title, records);
      await fs.writeFile(resolvedFilename, html, 'utf8');

      this.info?.(`visualizer → reporte generado en ${resolvedFilename}`);
      if (open) {
        console.log(`ℹ️  Abrí manualmente el archivo en tu navegador: ${resolvedFilename}`);
      }
    },
  };
}

export default visualizer;
