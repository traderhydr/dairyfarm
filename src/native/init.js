// Native-app-only behaviour: Android back button, notification reminders, web-only UI hidden.
import { isNative } from '../lib/platform.js';
import { onChange, snapshot } from '../state.js';
import { closeSheets, hasOpenSheet } from '../ui/sheets.js';
import { getActiveTab, switchTab } from '../ui/tabs.js';
import { showToast } from '../ui/toast.js';
import { createReminderScheduler, remindersPref } from './reminders.js';

const $ = (id) => document.getElementById(id);

// [modal id, id of the button that dismisses it], topmost first
const MODALS = [
  ['confirmModal', 'modalCancelBtn'],
  ['accountModal', 'accountCloseBtn'],
  ['calvingModal', 'calvingCancelBtn'],
  ['installGuideModal', 'closeInstallGuideBtn']
];

/** Handle the Android back button; returns false when the app should exit. */
export function handleBack() {
  for (const [modalId, closeId] of MODALS) {
    const modal = $(modalId);
    if (modal && !modal.classList.contains('hidden')) {
      $(closeId).click();
      return true;
    }
  }
  if (hasOpenSheet()) {
    closeSheets();
    return true;
  }
  const drawer = $('sideMenuDrawer');
  if (drawer && !drawer.classList.contains('-translate-x-full')) {
    $('closeSideMenuBtn').click();
    return true;
  }
  if (getActiveTab() !== 'finance') {
    switchTab('finance');
    return true;
  }
  return false;
}

function renderRemindersButton() {
  $('remindersBtnLabel').textContent = remindersPref.get() ? 'Reminders: On' : 'Reminders: Off';
}

async function initReminders() {
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  const scheduler = createReminderScheduler(LocalNotifications, snapshot);
  const btn = $('remindersBtn');
  btn.classList.remove('hidden');
  btn.classList.add('flex');
  renderRemindersButton();

  let timer = null;
  const reschedule = () => scheduler.reschedule().catch(() => {});
  onChange(() => {
    if (!remindersPref.get()) return;
    clearTimeout(timer);
    timer = setTimeout(reschedule, 2000);
  });

  btn.addEventListener('click', async () => {
    try {
      if (remindersPref.get()) {
        await scheduler.disable();
        remindersPref.set(false);
        showToast('Reminders turned off');
      } else if (await scheduler.requestPermission()) {
        remindersPref.set(true);
        const count = await scheduler.reschedule();
        showToast(count ? `Reminders on - ${count} upcoming` : 'Reminders on - nothing due yet');
      } else {
        showToast('Allow notifications in your phone settings to get reminders');
      }
    } catch (e) {
      showToast('Could not change reminders');
    }
    renderRemindersButton();
  });

  if (remindersPref.get()) reschedule(); // keep them fresh on every app start
}

export async function initNative() {
  if (!isNative) return;
  document.documentElement.classList.add('is-native');

  const { App } = await import('@capacitor/app');
  App.addListener('backButton', () => {
    if (!handleBack()) App.exitApp();
  });

  await initReminders();
}
