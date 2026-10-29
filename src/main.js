import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/plus-jakarta-sans/latin-600.css';
import '@fontsource/plus-jakarta-sans/latin-700.css';
import '@fontsource/plus-jakarta-sans/latin-800.css';
import './styles.css';

import { initDataManagement } from './data-management.js';
import { initExport } from './export.js';
import { todayStr } from './lib/dates.js';
import { loadState, onChange } from './state.js';
import { initMenu } from './ui/menu.js';
import { initModal } from './ui/modal.js';
import { initTabs } from './ui/tabs.js';
import { initAlerts, renderAlerts } from './views/alerts.js';
import { initBreeding, renderBreeding, updateBreedingPreview } from './views/breeding.js';
import { initDoodhi, renderDoodhi } from './views/doodhi.js';
import { initFinance, renderExpenseBreakdown, renderTransactions } from './views/finance.js';
import { initHealth, renderHealth } from './views/health.js';
import { initMilkers, renderMilkers } from './views/milkers.js';
import { initSales, renderSales } from './views/sales.js';
import { renderSummary } from './views/summary.js';
import { initWachi, renderWachi } from './views/wachi.js';
import { initWanda, renderWanda, updateWandaFormPreview } from './views/wanda.js';

function renderAll() {
  renderSummary();
  renderAlerts();
  renderTransactions();
  renderExpenseBreakdown();
  renderBreeding();
  renderWanda();
  renderMilkers();
  renderWachi();
  renderHealth();
  renderSales();
  renderDoodhi();
}

/** Default every date input to today (the markup ships without stale hardcoded dates). */
function setDateDefaults() {
  const today = todayStr();
  ['txDate', 'aiDate', 'wandaPurchaseDate', 'calvingDateInput', 'milkSaleDate',
    'healthDateGiven', 'saleDate', 'doodhiStartDate'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = today;
  });
}

function boot() {
  setDateDefaults();
  loadState();
  updateBreedingPreview();
  updateWandaFormPreview();
  renderAll();
  onChange(renderAll);

  initTabs();
  initFinance();
  initAlerts();
  initBreeding();
  initWanda();
  initMilkers();
  initWachi();
  initHealth();
  initMenu();
  initExport();
  initSales();
  initDoodhi();
  initDataManagement();
  initModal();
  // Accounts + cloud sync are only bundled when the build has a Supabase project configured.
  if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
    import('./ui/account.js').then((m) => m.initAccount());
  }
}

window.addEventListener('DOMContentLoaded', boot);
