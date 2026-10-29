// Schedules the reminders from lib/reminders.js as local notifications (works offline).
import { buildReminders } from '../lib/reminders.js';

const PREF_KEY = 'dairy_reminders_enabled';
const SMALL_ICON = 'ic_stat_cow';

export const remindersPref = {
  get: () => {
    try { return localStorage.getItem(PREF_KEY) === '1'; } catch (e) { return false; }
  },
  set: (on) => {
    try { localStorage.setItem(PREF_KEY, on ? '1' : '0'); } catch (e) { /* ignore */ }
  }
};

/** @param plugin the Capacitor LocalNotifications plugin (injected so it can be faked in tests) */
export function createReminderScheduler(plugin, getState, now = () => new Date()) {
  async function cancelAll() {
    const { notifications } = await plugin.getPending();
    if (notifications.length) await plugin.cancel({ notifications });
  }

  return {
    /** Ask for permission; resolves true if notifications may be shown. */
    async requestPermission() {
      const current = await plugin.checkPermissions();
      if (current.display === 'granted') return true;
      const asked = await plugin.requestPermissions();
      return asked.display === 'granted';
    },

    /** Replace everything scheduled with the current upcoming reminders. */
    async reschedule() {
      await cancelAll();
      const reminders = buildReminders(getState(), now());
      if (!reminders.length) return 0;
      await plugin.schedule({
        notifications: reminders.map((r) => ({
          id: r.id,
          title: r.title,
          body: r.body,
          smallIcon: SMALL_ICON,
          schedule: { at: r.at, allowWhileIdle: true }
        }))
      });
      return reminders.length;
    },

    disable: cancelAll
  };
}
