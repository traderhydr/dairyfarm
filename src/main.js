import './styles.css';

import { initDataManagement } from './data-management.js';
import { initExport } from './export.js';
import { todayStr } from './lib/dates.js';
import { isNative } from './lib/platform.js';
import { initNative } from './native/init.js';
import { loadState, onChange } from './state.js';
import { initMenu } from './ui/menu.js';
import { playEnter } from './ui/motion.js';
import { initSheets } from './ui/sheets.js';
import { initTheme } from './ui/theme.js';
import { initModal } from './ui/modal.js';
import { initTabs } from './ui/tabs.js';
import { initAlerts, renderAlerts } from './views/alerts.js';
import { initAnimals, renderAnimals } from './views/animals.js';
import { initBreeding, renderBreeding, updateBreedingPreview } from './views/breeding.js';
import { initDoodhi, renderDoodhi } from './views/doodhi.js';
import { initFinance, renderExpenseBreakdown, renderTransactions } from './views/finance.js';
import { initProfit, renderProfit } from './views/profit.js';
import { initLedgers, renderLedgers } from './views/ledgers.js';
import { initFarm, renderFarm } from './views/farm.js';
import { initCrops, renderCrops } from './views/crops.js';
import { initLands, renderLands } from './views/lands.js';
import { initI18n } from './i18n/index.js';
import { initMode } from './ui/mode.js';
import { initGoats, renderGoats } from './views/goats.js';
import { initHorses, renderHorses } from './views/horses.js';
import { initHealth, renderHealth } from './views/health.js';
import { initMilkers, renderMilkers } from './views/milkers.js';
import { initSales, renderSales } from './views/sales.js';
import { initSavings, renderSavings } from './views/savings.js';
import { renderSummary } from './views/summary.js';
import { renderTrends } from './views/trends.js';
import { initWachi, renderWachi } from './views/wachi.js';
import { initWanda, renderWanda, updateWandaFormPreview } from './views/wanda.js';

function renderAll() {
  renderSummary();
  renderFarm();
  renderAlerts();
  renderLedgers();
  renderAnimals();
  renderTransactions();
  renderProfit();
  renderExpenseBreakdown();
  renderTrends();
  renderBreeding();
  renderWanda();
  renderMilkers();
  renderWachi();
  renderGoats();
  renderLands();
  renderCrops();
  renderHorses();
  renderHealth();
  renderSales();
  renderDoodhi();
  renderSavings();
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
  initTheme();
  document.getElementById('drawerVersion').textContent = `Dairy Farm Manager v${__APP_VERSION__}`;
  setDateDefaults();
  loadState();
  updateBreedingPreview();
  updateWandaFormPreview();
  renderAll();
  playEnter(document.getElementById('financeSection'), document.getElementById('farmCard'), document.getElementById('overviewSection'), document.getElementById('farmAlertsSection'));
  onChange(renderAll);

  initTabs();
  initSheets();
  initFinance();
  initLedgers();
  initProfit();
  initAnimals();
  initAlerts();
  initBreeding();
  initWanda();
  initMilkers();
  initWachi();
  initGoats();
  initLands();
  initCrops();
  initFarm();
  initHorses();
  initHealth();
  initMenu();
  initExport();
  initSales();
  initDoodhi();
  initSavings();
  initDataManagement();
  initModal();
  initMode();
  initI18n();
  document.addEventListener('langchange', renderAll);
  // Accounts + cloud sync are only bundled when the build has a Supabase project configured.
  if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
    import('./ui/account.js').then((m) => m.initAccount());
  }
}

window.addEventListener('DOMContentLoaded', () => {
  boot();
  initNative();
  // The offline service worker is for browsers/PWA only: the native app already ships its files.
  if (!isNative) import('virtual:pwa-register').then((m) => m.registerSW({ immediate: true }));
});
