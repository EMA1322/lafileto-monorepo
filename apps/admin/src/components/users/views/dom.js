export const $ = (sel) => document.querySelector(sel);
export const $$ = (sel) => Array.from(document.querySelectorAll(sel));

export function els() {
  return {
    tabUsers: document.querySelector("#tab-users"),
    tabRoles: document.querySelector("#tab-roles"),
    panelUsers: document.querySelector("#panel-users"),
    panelRoles: document.querySelector("#panel-roles"),
    btnNew: document.querySelector("#btn-user-new"),
    btnRoleNew: document.querySelector("#btn-role-new"),
    statusUsers: document.querySelector("#users-status"),
    statusRoles: document.querySelector("#roles-status"),
    tableUsers: document.querySelector("#users-table"),
    tbodyUsers: document.querySelector("#users-tbody"),
    tbodyRoles: document.querySelector("#roles-tbody"),
  };
}
