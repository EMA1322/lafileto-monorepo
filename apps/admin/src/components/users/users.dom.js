export const $ = (sel, root = document) => (root || document).querySelector(sel);
export const $$ = (sel, root = document) => Array.from((root || document).querySelectorAll(sel));

export function els(root = document) {
  const scope = root instanceof Element ? root : document;
  return {
    tabUsers: scope.querySelector('#tab-users'),
    tabRoles: scope.querySelector('#tab-roles'),
    panelUsers: scope.querySelector('#panel-users'),
    panelRoles: scope.querySelector('#panel-roles'),
    btnNew: scope.querySelector('#btn-user-new'),
    btnRoleNew: scope.querySelector('#btn-role-new'),
    filtersForm: scope.querySelector('#users-filters'),
    searchInput: scope.querySelector('#users-filter-q'),
    orderBySelect: scope.querySelector('#users-filter-order-by'),
    orderDirSelect: scope.querySelector('#users-filter-order-dir'),
    pageSizeSelect: scope.querySelector('#users-filter-page-size'),
    clearFiltersButton: scope.querySelector('#users-filter-clear'),
    statusUsers: scope.querySelector('#users-status'),
    statusRoles: scope.querySelector('#roles-status'),
    loadingState: scope.querySelector('#users-loading'),
    errorState: scope.querySelector('#users-error'),
    errorMessage: scope.querySelector('#users-error-message'),
    retryButton: scope.querySelector('#users-retry'),
    emptyState: scope.querySelector('#users-empty'),
    emptyClearButton: scope.querySelector('#users-empty-clear'),
    tableWrapper: scope.querySelector('#users-table-wrapper'),
    tableUsers: scope.querySelector('#users-table'),
    tbodyUsers: scope.querySelector('#users-tbody'),
    meta: scope.querySelector('#users-meta'),
    pagination: scope.querySelector('#users-page-list'),
    pageFirst: scope.querySelector('#users-page-first'),
    pagePrev: scope.querySelector('#users-page-prev'),
    pageNext: scope.querySelector('#users-page-next'),
    pageLast: scope.querySelector('#users-page-last'),
    tbodyRoles: scope.querySelector('#roles-tbody'),
  };
}
