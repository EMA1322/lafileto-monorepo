export const $ = (sel) => document.querySelector(sel);
export const $$ = (sel) => Array.from(document.querySelectorAll(sel));

export function els() {
  return {
    tabUsers: document.querySelector("#tab-users"),
    tabRoles: document.querySelector("#tab-roles"),
    panelUsers: document.querySelector("#panel-users"),
    panelRoles: document.querySelector("#panel-roles"),
    pageSize: document.querySelector("#users-page-size"),
    search: document.querySelector("#users-search"),
    btnNew: document.querySelector("#btn-user-new"),
    btnRoleNew: document.querySelector("#btn-role-new"),
    statusUsers: document.querySelector("#users-status"),
    statusRoles: document.querySelector("#roles-status"),
    tableUsers: document.querySelector("#users-table"),
    tbodyUsers: document.querySelector("#users-tbody"),
    countUsers: document.querySelector("#users-count"),
    pagination: document.querySelector("#users-pagination"),
    pagePrev: document.querySelector("#users-page-prev"),
    pageNext: document.querySelector("#users-page-next"),
    pageInfo: document.querySelector("#users-page-info"),
    tbodyRoles: document.querySelector("#roles-tbody"),
  };
}
