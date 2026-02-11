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
    const row = tbody?.querySelector('tr[data-id="cat-1"]');
    const actionCell = row?.querySelector('.categories__cell-actions.adminList__td--actions');
    const actionGroup = actionCell?.querySelector('.categories__row-actions.adminList__rowActions');
    const buttons = actionGroup?.querySelectorAll('button') ?? [];

    expect(actionCell).not.toBeNull();
    expect(buttons).toHaveLength(3);
    expect(Array.from(buttons).map((button) => button.textContent?.trim())).toEqual(['Ver', 'Editar', 'Eliminar']);
    expect(buttons[0]?.className).toContain('btn--ghost');
    expect(buttons[1]?.className).toContain('btn--ghost');
    expect(buttons[2]?.className).toContain('btn--danger');
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
    const pageSizeSelect = document.querySelector('#categories-page-size');
    expect(pageSizeSelect?.value).toBe('20');
    expect(document.querySelectorAll('#categories-page-size')).toHaveLength(1);
    expect(pageSizeSelect?.closest('.categories__toolbar')).not.toBeNull();
    expect(pageSizeSelect?.closest('.categories__footer')).toBeNull();

    const pageSizeLabel = document.querySelector('label[for="categories-page-size"]');
    expect(pageSizeLabel).not.toBeNull();
    expect(pageSizeLabel?.textContent).toContain('Resultados por página');

    const toolbarActions = document.querySelector('.categories__control--actions');
    const actionsText = toolbarActions?.textContent ?? '';
    expect(toolbarActions).not.toBeNull();
    expect(actionsText).toContain('Limpiar filtros');
    expect(actionsText).toContain('Nueva');

    expect(document.querySelector('#categories-page-first')?.dataset.page).toBe('1');
    expect(document.querySelector('#categories-page-prev')?.dataset.page).toBe('2');
    expect(document.querySelector('#categories-page-next')?.dataset.page).toBe('4');
    expect(document.querySelector('#categories-page-last')?.dataset.page).toBe('5');

    const current = document.querySelector("#categories-page-list [aria-current='page']");
    expect(current?.textContent).toBe('3');
  });

});
