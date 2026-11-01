import { closeSheets } from './sheets.js';

// Bottom navigation (4 main modules + More) and the side menu (everything else).
const SECTIONS = {
  finance: { section: 'financeSection', button: 'tabFinanceBtn', style: 'nav' },
  milkers: { section: 'milkersSection', button: 'tabMilkersBtn', style: 'nav' },
  breeding: { section: 'breedingSection', button: 'tabBreedingBtn', style: 'nav' },
  wanda: { section: 'wandaSection', button: 'tabWandaBtn', style: 'nav' },
  wachi: { section: 'wachiSection', button: 'tabWachiBtn', style: 'drawer', title: 'Wachi (Heifers)' },
  health: { section: 'healthSection', button: 'tabHealthBtn', style: 'drawer', title: 'Vaccination & Deworming' },
  sales: { section: 'salesSection', button: 'tabSalesBtn', style: 'drawer', title: 'Sold Cows' },
  doodhi: { section: 'doodhiSection', button: 'tabDoodhiBtn', style: 'drawer', title: 'Milk Buyers (Doodhi)' }
};

const DRAWER_CLASSES = {
  active: 'w-full px-3.5 py-3 text-sm font-bold rounded-xl bg-emerald-600 text-white flex items-center justify-between gap-2 transition text-left',
  inactive: 'w-full px-3.5 py-3 text-sm font-semibold rounded-xl text-slate-700 hover:bg-slate-100 flex items-center justify-between gap-2 transition text-left'
};

const $ = (id) => document.getElementById(id);

let activeTab = 'finance';

export const getActiveTab = () => activeTab;

function openSideMenu() {
  $('sideMenuBackdrop').classList.remove('hidden');
  $('sideMenuDrawer').classList.remove('-translate-x-full');
}

function closeSideMenu() {
  $('sideMenuDrawer').classList.add('-translate-x-full');
  $('sideMenuBackdrop').classList.add('hidden');
}

function setActive(entry, on) {
  const btn = $(entry.button);
  if (entry.style === 'nav') btn.classList.toggle('is-active', on);
  else btn.className = on ? DRAWER_CLASSES.active : DRAWER_CLASSES.inactive;
}

export function switchTab(target) {
  const active = SECTIONS[target];
  if (!active) return;
  activeTab = target;

  for (const entry of Object.values(SECTIONS)) {
    const section = $(entry.section);
    section.classList.add('hidden');
    section.classList.remove('grid');
    setActive(entry, false);
  }

  const section = $(active.section);
  section.classList.remove('hidden');
  section.classList.add('grid');
  setActive(active, true);
  document.body.dataset.tab = target;
  closeSheets();

  const inDrawer = active.style === 'drawer';
  $('sideMenuActiveDot').classList.toggle('hidden', !inDrawer);
  $('sideModuleBanner').classList.toggle('hidden', !inDrawer);
  if (inDrawer) $('sideModuleBannerName').textContent = active.title;

  closeSideMenu();
}

export function initTabs() {
  $('openSideMenuBtn').addEventListener('click', openSideMenu);
  $('closeSideMenuBtn').addEventListener('click', closeSideMenu);
  $('sideMenuBackdrop').addEventListener('click', closeSideMenu);
  $('openMoreBtn').addEventListener('click', openSideMenu);

  for (const [name, entry] of Object.entries(SECTIONS)) {
    $(entry.button).addEventListener('click', () => switchTab(name));
  }
  $('backToCenterCashflowBtn').addEventListener('click', () => switchTab('finance'));

  document.querySelectorAll('[data-drawer-jump]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-drawer-jump');
      if (target) switchTab(target);
    });
  });
}
