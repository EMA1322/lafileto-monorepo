import { state } from './users.state.js';
import { els } from './users.dom.js';

export default function switchTab(tab) {
  const { tabUsers, tabRoles, panelUsers, panelRoles } = els();
  const container = tabUsers?.closest('.users') || tabRoles?.closest('.users') || document.querySelector('.users');
  state.ui.activeTab = tab;
  if (container) container.dataset.rbacActiveTab = tab;

  if (tab === 'users') {
    tabUsers?.classList.add('is-active');
    tabUsers?.setAttribute('aria-selected', 'true');
    if (tabUsers) tabUsers.tabIndex = 0;

    tabRoles?.classList.remove('is-active');
    tabRoles?.setAttribute('aria-selected', 'false');
    if (tabRoles) tabRoles.tabIndex = -1;

    panelUsers?.classList.add('is-active');
    panelUsers?.removeAttribute('hidden');

    panelRoles?.classList.remove('is-active');
    panelRoles?.setAttribute('hidden', 'true');
  } else {
    tabRoles?.classList.add('is-active');
    tabRoles?.setAttribute('aria-selected', 'true');
    if (tabRoles) tabRoles.tabIndex = 0;

    tabUsers?.classList.remove('is-active');
    tabUsers?.setAttribute('aria-selected', 'false');
    if (tabUsers) tabUsers.tabIndex = -1;

    panelRoles?.classList.add('is-active');
    panelRoles?.removeAttribute('hidden');

    panelUsers?.classList.remove('is-active');
    panelUsers?.setAttribute('hidden', 'true');
  }
}
