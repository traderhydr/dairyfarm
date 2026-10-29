let toastTimer = null;

export function showToast(msg) {
  const banner = document.getElementById('toastBanner');
  const text = document.getElementById('toastMessage');
  text.textContent = msg;
  banner.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    banner.classList.add('hidden');
  }, 2500);
}
