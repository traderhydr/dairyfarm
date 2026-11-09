let toastTimer = null;

/**
 * Brief feedback. A plain "saved" confirmation is just a small green tick in the upper right corner
 * (its text is kept for screen readers). Problems and longer messages that carry information use the
 * text bar: pass 'error' or 'info', or write a message longer than 40 characters.
 */
export function showToast(msg, kind = 'ok') {
  const banner = document.getElementById('toastBanner');
  const text = document.getElementById('toastMessage');
  const tick = kind === 'ok' && String(msg).length <= 40;
  banner.classList.toggle('toast-tick', tick);
  banner.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  text.textContent = msg;
  banner.classList.add('hidden'); // restart the animation when a new message arrives while one is showing
  void banner.offsetWidth;
  banner.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    banner.classList.add('hidden');
  }, tick ? 1600 : 2500);
}
