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

  // Dark / Light Theme Toggle
  document.getElementById('themeToggleBtn').addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark-mode');
    document.getElementById('themeToggleLabel').textContent = isDark ? 'Light Mode' : 'Dark Mode';
  });

}
