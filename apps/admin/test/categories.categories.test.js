import { readFileSync } from 'node:fs';

import { describe, it, expect, beforeEach } from 'vitest';

const categoriesTemplate = readFileSync(
  new URL('../src/components/categories/categories.html', import.meta.url),
  'utf8',
);

function seedPermissions() {
  sessionStorage.setItem(
    'rbac.permMap',
    JSON.stringify({
      categories: { r: true, w: true, u: true, d: true },
    }),
  );
}

describe('admin categories module', () => {
  let renderCategoriesTable;

  beforeEach(async () => {
    document.body.innerHTML = categoriesTemplate;
    seedPermissions();

    const container = document.querySelector('#categories-view');
    if (container) {
      container.dataset.rbacModule = 'categories';
      container.dataset.rbacAlias = 'category';
      container.dataset.rbacRoleId = 'role-admin';
      container.dataset.rbacIsAdmin = 'true';
      container.dataset.rbacAdminRoles = 'role-admin';
      container.dataset.rbacActiveTab = 'categories';
    }

    ({ renderCategoriesTable } = await import('../src/components/categories/categories.render.table.js'));
  });

  it('renderCategoriesTable pinta filas con el template real', () => {
    renderCategoriesTable({
      loading: false,
      error: null,
      viewItems: [
        {
          id: 'cat-1',
          name: 'Pastas',
          imageUrl: 'https://cdn.example.com/categories/pastas.webp',
          productCount: 4,
          active: true,
        },
      ],
      meta: {
        page: 1,
        pageCount: 1,
        total: 1,
        pageSize: 10,
      },
    });

    const tbody = document.querySelector('#categories-tbody');
    const normalized = tbody?.innerHTML.replace(/\s+/g, ' ').trim();
    expect(normalized).toMatchInlineSnapshot(
      `"<tr data-id="cat-1"> <td class=\\"categories__cell-name\\">Pastas</td> <td class=\\"categories__cell-image\\"> <img src=\\"https://cdn.example.com/categories/pastas.webp\\" alt=\\"Imagen de Pastas\\" class=\\"categories__image\\" loading=\\"lazy\\" decoding=\\"async\\"> </td> <td class=\\"categories__cell-count\\">4</td> <td class=\\"categories__cell-status\\"><span class=\\"badge badge--success\\">Activo</span></td> <td class=\\"categories__cell-actions\\" data-column=\\"actions\\"> <div class=\\"categories__row-actions\\" role=\\"group\\" aria-label=\\"Acciones\\"> <button class=\\"btn btn--ghost btn--icon categories__actionIcon\\" type=\\"button\\" data-action=\\"view\\" data-id=\\"cat-1\\" aria-label=\\"Ver categoría\\" title=\\"Ver categoría\\"> <svg class=\\"icon icon--sm\\" viewBox=\\"0 0 24 24\\" stroke-width=\\"1.5\\" stroke=\\"currentColor\\" fill=\\"none\\" stroke-linecap=\\"round\\" stroke-linejoin=\\"round\\" aria-hidden=\\"true\\"><path d=\\"M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z\\"></path><circle cx=\\"12\\" cy=\\"12\\" r=\\"3\\"></circle></svg> </button> <button class=\\"btn btn--secondary btn--sm\\" type=\\"button\\" data-action=\\"edit\\" data-id=\\"cat-1\\" data-rbac-action=\\"update\\" data-rbac-hide=\\"\\"> <svg class=\\"icon icon--sm\\" viewBox=\\"0 0 24 24\\" stroke-width=\\"1.5\\" stroke=\\"currentColor\\" fill=\\"none\\" stroke-linecap=\\"round\\" stroke-linejoin=\\"round\\" aria-hidden=\\"true\\"><path d=\\"M4 17.5V20h2.5L17.81 8.69a2 2 0 0 0-2.83-2.83L4 17.5z\\"></path><path d=\\"M14.88 6.12l2.99 2.99\\"></path></svg> <span class=\\"icon-label\\">Editar</span> </button> <button class=\\"btn btn--sm categories__action--danger\\" type=\\"button\\" data-action=\\"delete\\" data-id=\\"cat-1\\" data-rbac-action=\\"delete\\"> <svg class=\\"icon icon--sm\\" viewBox=\\"0 0 24 24\\" stroke-width=\\"1.5\\" stroke=\\"currentColor\\" fill=\\"none\\" stroke-linecap=\\"round\\" stroke-linejoin=\\"round\\" aria-hidden=\\"true\\"><path d=\\"M5 7h14\\"></path><path d=\\"M10 11v6\\"></path><path d=\\"M14 11v6\\"></path><path d=\\"M6 7l1 12a2 2 0 0 0 2 1.8h6a2 2 0 0 0 2-1.8l1-12\\"></path><path d=\\"M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2\\"></path></svg> <span class=\\"icon-label\\">Eliminar</span> </button> </div> </td> </tr>"`
    );
    expect(document.querySelector('#categories-summary')?.textContent).toBe('1–1 de 1');
    expect(document.querySelector('#categories-empty')?.hasAttribute('hidden')).toBe(true);
  });

  it('renderCategoriesTable configura controles completos de paginación', () => {
    renderCategoriesTable({
      loaded: true,
      loading: false,
      error: null,
      viewItems: [
        { id: 'cat-1', name: 'Pastas', active: true, productCount: 4 },
      ],
      meta: {
        page: 3,
        pageCount: 5,
        total: 48,
        pageSize: 20,
      },
    });

    expect(document.querySelector('#categories-summary')?.textContent).toBe('41–48 de 48');
    expect(document.querySelector('#categories-page-size')?.value).toBe('20');
    expect(document.querySelectorAll('#categories-page-size')).toHaveLength(1);
    expect(document.querySelector('#categories-refresh')).toBeNull();
    expect(document.querySelector('#categories-page-first')?.dataset.page).toBe('1');
    expect(document.querySelector('#categories-page-prev')?.dataset.page).toBe('2');
    expect(document.querySelector('#categories-page-next')?.dataset.page).toBe('4');
    expect(document.querySelector('#categories-page-last')?.dataset.page).toBe('5');

    const current = document.querySelector("#categories-page-list [aria-current='page']");
    expect(current?.textContent).toBe('3');
  });

});
