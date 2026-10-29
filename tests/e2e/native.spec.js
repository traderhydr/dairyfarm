import { expect, test } from '@playwright/test';

// Capacitor treats the page as native when `androidBridge` exists and routes plugin calls through
// cap.nativePromise / cap.nativeCallback. We fake those so the native code paths run in a browser.
test.beforeEach(async ({ page }) => {
  page.on('pageerror', (e) => { throw e; });
  await page.addInitScript(() => {
    const calls = [];
    const listeners = {};
    const methods = (names, rtype = 'promise') => names.map((name) => ({ name, rtype }));
    const state = { permission: 'prompt' };
    window.__calls = calls;
    window.__fire = (plugin, event) => (listeners[`${plugin}:${event}`] || []).forEach((cb) => cb({}));
    window.androidBridge = { postMessage() {} };
    window.Capacitor = {
      PluginHeaders: [
        { name: 'App', methods: [...methods(['exitApp']), { name: 'addListener', rtype: 'callback' }, ...methods(['removeListener'])] },
        { name: 'LocalNotifications', methods: [...methods(['checkPermissions', 'requestPermissions', 'getPending', 'cancel', 'schedule']), { name: 'addListener', rtype: 'callback' }, ...methods(['removeListener'])] },
        { name: 'Filesystem', methods: methods(['writeFile']) },
        { name: 'Share', methods: methods(['share']) }
      ],
      nativeCallback(plugin, method, options, cb) {
        if (method === 'addListener') (listeners[`${plugin}:${options.eventName}`] ||= []).push(cb);
        return Promise.resolve(String(Math.random()));
      },
      async nativePromise(plugin, method, options) {
        calls.push({ plugin, method, options });
        if (plugin === 'LocalNotifications') {
          if (method === 'checkPermissions') return { display: state.permission };
          if (method === 'requestPermissions') { state.permission = 'granted'; return { display: 'granted' }; }
          if (method === 'getPending') return { notifications: [] };
        }
        if (plugin === 'Filesystem' && method === 'writeFile') return { uri: `file:///cache/${options.path}` };
        return {};
      }
    };
  });
  await page.goto('/');
  await page.locator('#remindersBtn').waitFor({ state: 'visible' });
});

const click = (page, id) => page.locator(`#${id}`).evaluate((el) => el.click());
const calls = (page, plugin, method) => page.evaluate(([p, m]) => window.__calls.filter((c) => c.plugin === p && c.method === m), [plugin, method]);

test('hides browser-only buttons and skips the service worker', async ({ page }) => {
  await expect(page.locator('#openInstallGuideBtn')).toBeHidden();
  await expect(page.locator('#printReportBtn')).toBeHidden();
  const registrations = await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length);
  expect(registrations).toBe(0);
});

test('turning reminders on asks permission and schedules upcoming events', async ({ page }) => {
  await click(page, 'resetDemoBtn');
  await click(page, 'modalConfirmBtn');
  await expect(page.locator('#remindersBtnLabel')).toHaveText('Reminders: Off');
  await click(page, 'remindersBtn');
  await expect(page.locator('#remindersBtnLabel')).toHaveText('Reminders: On');
  expect(await calls(page, 'LocalNotifications', 'requestPermissions')).toHaveLength(1);
  const [schedule] = await calls(page, 'LocalNotifications', 'schedule');
  expect(schedule.options.notifications.length).toBeGreaterThan(0);
  expect(schedule.options.notifications[0]).toMatchObject({ smallIcon: 'ic_stat_cow' });

  // turning it off cancels
  await click(page, 'remindersBtn');
  await expect(page.locator('#remindersBtnLabel')).toHaveText('Reminders: Off');
});

test('Android back button closes overlays, then returns to Cashflow, then exits', async ({ page }) => {
  await click(page, 'openSideMenuBtn');
  await expect(page.locator('#sideMenuDrawer')).not.toHaveClass(/-translate-x-full/);
  await page.evaluate(() => window.__fire('App', 'backButton'));
  await expect(page.locator('#sideMenuDrawer')).toHaveClass(/-translate-x-full/);

  await click(page, 'tabWandaBtn');
  await expect(page.locator('#wandaSection')).toBeVisible();
  await page.evaluate(() => window.__fire('App', 'backButton'));
  await expect(page.locator('#financeSection')).toBeVisible();
  expect(await calls(page, 'App', 'exitApp')).toHaveLength(0);

  await page.evaluate(() => window.__fire('App', 'backButton'));
  await expect.poll(async () => (await calls(page, 'App', 'exitApp')).length).toBe(1);
});

test('backup opens the share sheet instead of a browser download', async ({ page }) => {
  await click(page, 'backupJsonBtn');
  await expect.poll(async () => (await calls(page, 'Share', 'share')).length).toBe(1);
  const [write] = await calls(page, 'Filesystem', 'writeFile');
  expect(write.options.path).toBe('dairy_farm_full_backup.json');
  expect(JSON.parse(write.options.data).app).toBe('Dairy Farm Manager');
  const [share] = await calls(page, 'Share', 'share');
  expect(share.options.url).toBe('file:///cache/dairy_farm_full_backup.json');
});
