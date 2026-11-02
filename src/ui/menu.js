import { toggleTheme } from './theme.js';

export function initMenu() {
  // Install Guide Modal Listeners
  const installGuideModal = document.getElementById('installGuideModal');
  document.getElementById('openInstallGuideBtn').addEventListener('click', () => {
    installGuideModal.classList.remove('hidden');
  });
  document.getElementById('closeInstallGuideBtn').addEventListener('click', () => {
    installGuideModal.classList.add('hidden');
  });
  document.getElementById('doneInstallGuideBtn').addEventListener('click', () => {
    installGuideModal.classList.add('hidden');
  });

  document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);
}
