// Bottom dock (5 main tabs) + side drawer (3 extra modules).
const SECTIONS = {
  finance: { section: 'financeSection', button: 'tabFinanceBtn', style: 'center' },
  breeding: { section: 'breedingSection', button: 'tabBreedingBtn', style: 'dock' },
  wanda: { section: 'wandaSection', button: 'tabWandaBtn', style: 'dock' },
  milkers: { section: 'milkersSection', button: 'tabMilkersBtn', style: 'dock' },
  wachi: { section: 'wachiSection', button: 'tabWachiBtn', style: 'dock' },
  health: { section: 'healthSection', button: 'tabHealthBtn', style: 'drawer', title: '6. Vaccination & Deworming' },
  sales: { section: 'salesSection', button: 'tabSalesBtn', style: 'drawer', title: '7. Sold Cows Log' },
  doodhi: { section: 'doodhiSection', button: 'tabDoodhiBtn', style: 'drawer', title: '8. Doodhi Milk Khata' }
};

const CLASSES = {
  center: {
    active: 'relative -mt-5 px-2 py-2.5 text-[10px] sm:text-xs font-extrabold rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-900/30 ring-2 ring-white/80 flex flex-col items-center justify-center gap-0.5 transition transform scale-[1.04]',
    inactive: 'relative -mt-4 px-2 py-2 text-[10px] sm:text-xs font-extrabold rounded-2xl bg-emerald-50/90 hover:bg-emerald-100 text-emerald-900 border border-emerald-300/90 shadow-sm flex flex-col items-center justify-center gap-0.5 transition'
  },
  dock: {
    active: 'relative px-1.5 py-2 text-[10px] sm:text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs flex flex-col items-center justify-center gap-0.5 transition',
    inactive: 'relative px-1.5 py-2 text-[10px] sm:text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 flex flex-col items-center justify-center gap-0.5 transition'
  },
  drawer: {
    active: 'w-full px-3.5 py-3 text-xs sm:text-sm font-bold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs flex items-center justify-between gap-2 transition text-left',
    inactive: 'w-full px-3.5 py-3 text-xs sm:text-sm font-semibold rounded-xl text-slate-700 hover:bg-slate-100 flex items-center justify-between gap-2 transition text-left'
  }
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

export function switchTab(target) {
  const active = SECTIONS[target];
  if (!active) return;
  activeTab = target;

  for (const entry of Object.values(SECTIONS)) {
    const section = $(entry.section);
    section.classList.add('hidden');
    section.classList.remove('grid');
    $(entry.button).className = CLASSES[entry.style].inactive;
  }

  const section = $(active.section);
  section.classList.remove('hidden');
  section.classList.add('grid');
  $(active.button).className = CLASSES[active.style].active;

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
