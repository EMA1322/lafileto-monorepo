import { canDeleteUsers, canUpdateUsers, canWriteUsers } from './rbac.js';

export function applyRbacToView(refs, snapshot) {
  if (!refs) return;
  const {
    tabRoles,
    panelRoles,
    panelUsers,
    userNewButton,
    roleNewButton,
    usersTbody,
    rolesTbody,
  } = refs;

  const { isAdmin, activeTab, sessionUserId } = snapshot;

  if (!isAdmin) {
    tabRoles?.setAttribute('hidden', 'true');
    panelRoles?.setAttribute('hidden', 'true');
    panelUsers?.removeAttribute('hidden');
  } else {
    tabRoles?.removeAttribute('hidden');
    if (activeTab === 'roles') {
      panelRoles?.removeAttribute('hidden');
      panelUsers?.setAttribute('hidden', 'true');
    } else {
      panelUsers?.removeAttribute('hidden');
      panelRoles?.setAttribute('hidden', 'true');
    }
  }

  if (userNewButton) {
    const allowed = canWriteUsers();
    userNewButton.disabled = !allowed;
    if (allowed) userNewButton.removeAttribute('hidden');
    else userNewButton.setAttribute('hidden', 'true');
  }

  if (roleNewButton) {
    const allowed = isAdmin;
    roleNewButton.disabled = !allowed;
    if (allowed) roleNewButton.removeAttribute('hidden');
    else roleNewButton.setAttribute('hidden', 'true');
  }

  if (usersTbody) {
    const allowUpdate = canUpdateUsers();
    const allowDelete = canDeleteUsers();
    const currentUserId = sessionUserId != null ? String(sessionUserId) : '';

    usersTbody.querySelectorAll('[data-action="user-edit"]').forEach((btn) => {
      btn.disabled = !allowUpdate;
      btn.toggleAttribute('hidden', !allowUpdate);
    });

    usersTbody.querySelectorAll('[data-action="user-toggle-status"]').forEach((btn) => {
      btn.disabled = !allowUpdate;
      if (!allowUpdate) btn.setAttribute('aria-disabled', 'true');
      else btn.removeAttribute('aria-disabled');
    });

    usersTbody.querySelectorAll('tr[data-user-id]').forEach((row) => {
      const deleteBtn = row.querySelector('[data-action="user-delete"]');
      if (!deleteBtn) return;
      const isSelf = currentUserId && currentUserId === String(row.dataset.userId || '');
      const disabled = !allowDelete || isSelf;
      deleteBtn.disabled = disabled;
      if (disabled) {
        deleteBtn.setAttribute(
          'title',
          !allowDelete ? 'No tenés permisos para eliminar usuarios.' : 'No podés eliminar tu propio usuario.'
        );
      } else {
        deleteBtn.removeAttribute('title');
      }
    });
  }

  if (rolesTbody) {
    rolesTbody.querySelectorAll('[data-role-action]').forEach((btn) => {
      btn.disabled = !isAdmin;
    });
  }
}
