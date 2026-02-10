import { readFileSync } from 'node:fs';

import { describe, it, expect, beforeEach } from 'vitest';

const productsTemplate = readFileSync(
  new URL('../src/components/products/products.html', import.meta.url),
  'utf8',
);

function seedPermissions() {
  sessionStorage.setItem(
    'rbac.permMap',
    JSON.stringify({
      products: { r: true, w: true, u: true, d: true },
    }),
  );
}

describe('admin products module', () => {
  let renderProductsView;
  let REQUEST_STATUS;

  beforeEach(async () => {
    document.body.innerHTML = productsTemplate;
    seedPermissions();

    const container = document.querySelector('#products-module');
    if (container) {
      container.dataset.rbacModule = 'products';
      container.dataset.rbacRoleId = 'role-admin';
      container.dataset.rbacIsAdmin = 'true';
      container.dataset.rbacAdminRoles = 'role-admin';
      container.dataset.rbacActiveTab = 'products';
    }

    ({ renderProductsView } = await import('../src/components/products/products.render.table.js'));
    ({ REQUEST_STATUS } = await import('../src/components/products/products.state.js'));
  });

  it('incluye estructura base del template y templates clonables', () => {
    expect(document.querySelector('#products-filters')).not.toBeNull();
    expect(document.querySelector('#products-table-body')).not.toBeNull();
    expect(document.querySelector('#products-meta')).not.toBeNull();
    expect(document.querySelector('#products-page-list')).not.toBeNull();

    const formTemplate = document.querySelector('#tpl-product-form');
    const deleteTemplate = document.querySelector('#tpl-product-delete');
    const viewTemplate = document.querySelector('#tpl-product-view');

    expect(formTemplate).toBeInstanceOf(HTMLTemplateElement);
    expect(deleteTemplate).toBeInstanceOf(HTMLTemplateElement);
    expect(viewTemplate).toBeInstanceOf(HTMLTemplateElement);

    const clonedForm = formTemplate?.content.firstElementChild?.cloneNode(true);
    const clonedDelete = deleteTemplate?.content.firstElementChild?.cloneNode(true);
    const clonedView = viewTemplate?.content.firstElementChild?.cloneNode(true);

    expect(clonedForm?.querySelector('#products-form')).not.toBeNull();
    expect(clonedForm?.querySelector('#field-status')).toBeNull();
    expect(clonedDelete?.querySelector('#confirm-delete')).not.toBeNull();
    expect(clonedView?.querySelector('#product-view-close')).not.toBeNull();
  });

  it('renderProductsView dibuja toolbar, tabla y estados base en éxito', () => {
    renderProductsView({
      status: REQUEST_STATUS.SUCCESS,
      items: [
        {
          id: 'prod-1',
          name: 'Pizza napolitana',
          imageUrl: 'https://cdn.example.com/products/pizza.webp',
          price: 12990,
          stock: 8,
          status: 'active',
          categoryId: 'cat-1',
        },
      ],
      categories: [{ id: 'cat-1', name: 'Pizzas' }],
      filters: {
        q: 'pizza',
        status: 'active',
        categoryId: 'cat-1',
        orderBy: 'name',
        orderDir: 'asc',
        pageSize: 10,
      },
      meta: {
        page: 1,
        pageSize: 10,
        total: 1,
        pageCount: 1,
      },
    });

    expect(document.querySelector('#product-create')).not.toBeNull();
    expect(document.querySelector('#products-loading')?.hasAttribute('hidden')).toBe(true);
    expect(document.querySelector('#products-error')?.hasAttribute('hidden')).toBe(true);
    expect(document.querySelector('#products-empty')?.hasAttribute('hidden')).toBe(true);
    expect(document.querySelector('#products-table-wrapper')?.hasAttribute('hidden')).toBe(false);

    const rows = document.querySelectorAll('#products-table-body tr');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.dataset.id).toBe('prod-1');
    expect(rows[0]?.querySelector('.products__actions [data-action="edit"]')).not.toBeNull();

    const statusToggle = rows[0]?.querySelector('[data-action="toggle-status"]');
    expect(statusToggle).not.toBeNull();
    expect(statusToggle?.textContent?.trim()).toBe('Activo');
    expect(statusToggle?.getAttribute('data-next-status')).toBe('draft');

    expect(document.querySelector('#products-meta')?.textContent).toBe('1–1 de 1 productos');
    expect(document.querySelector('#products-page-list button')?.textContent).toBe('1');

    const content = document.querySelector('.products__content');
    expect(content?.dataset.status).toBe('success');
    expect(content?.getAttribute('aria-busy')).toBe('false');
  });


  it('renderProductsView deshabilita toggle de estado mientras se procesa', () => {
    renderProductsView({
      status: REQUEST_STATUS.SUCCESS,
      items: [
        {
          id: 'prod-2',
          name: 'Empanada',
          price: 2000,
          stock: 4,
          status: 'draft',
          categoryId: 'cat-1',
        },
      ],
      categories: [{ id: 'cat-1', name: 'Pizzas' }],
      filters: { pageSize: 10 },
      meta: {
        page: 1,
        pageSize: 10,
        total: 1,
        pageCount: 1,
      },
      pendingStatusIds: ['prod-2'],
    });

    const statusToggle = document.querySelector('#products-table-body [data-action="toggle-status"]');
    expect(statusToggle?.disabled).toBe(true);
    expect(statusToggle?.textContent?.trim()).toBe('Guardando…');
  });

  it('renderProductsView muestra estado de error con controles deshabilitados', () => {
    renderProductsView({
      status: REQUEST_STATUS.ERROR,
      error: { message: 'No se pudo cargar products.' },
      items: [],
      meta: {
        page: 1,
        pageSize: 10,
        total: 0,
        pageCount: 1,
      },
    });

    expect(document.querySelector('#products-loading')?.hasAttribute('hidden')).toBe(true);
    expect(document.querySelector('#products-error')?.hasAttribute('hidden')).toBe(false);
    expect(document.querySelector('#products-empty')?.hasAttribute('hidden')).toBe(true);
    expect(document.querySelector('#products-table-wrapper')?.hasAttribute('hidden')).toBe(true);
    expect(document.querySelector('#products-error-message')?.textContent).toBe('No se pudo cargar products.');

    expect(document.querySelector('#products-meta')?.textContent).toBe('—');
    expect(document.querySelector('#page-first')?.disabled).toBe(true);
    expect(document.querySelector('#page-next')?.disabled).toBe(true);
  });
});
