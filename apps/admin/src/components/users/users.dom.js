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
    statusUsers: scope.querySelector('#users-status'),
    statusRoles: scope.querySelector('#roles-status'),
    tableUsers: scope.querySelector('#users-table'),
    tbodyUsers: scope.querySelector('#users-tbody'),
    tbodyRoles: scope.querySelector('#roles-tbody'),
  };
}
