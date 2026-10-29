let pendingModalAction = null;

export function openConfirmModal(title, desc, onConfirm) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalDesc').textContent = desc;
  pendingModalAction = onConfirm;
  document.getElementById('confirmModal').classList.remove('hidden');
}

export function closeConfirmModal() {
  pendingModalAction = null;
  document.getElementById('confirmModal').classList.add('hidden');
}

export function initModal() {
  document.getElementById('modalCancelBtn').addEventListener('click', closeConfirmModal);
  document.getElementById('modalConfirmBtn').addEventListener('click', () => {
    if (typeof pendingModalAction === 'function') {
      pendingModalAction();
    }
    closeConfirmModal();
  });
}
