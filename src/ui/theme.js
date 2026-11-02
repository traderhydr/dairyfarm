// Light / dark theme: remembered between visits, defaults to the phone's own setting.
import { SystemBars, SystemBarsStyle } from '@capacitor/core';
import { isNative } from '../lib/platform.js';

const KEY = 'dairy_theme';

function saved() {
  try {
    return localStorage.getItem(KEY);
  } catch (e) {
    return null;
  }
}

function prefersDark() {
  return Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches);
}

export function isDark() {
  return document.body.classList.contains('dark-mode');
}

export function applyTheme(dark) {
  document.body.classList.toggle('dark-mode', dark);
  const label = document.getElementById('themeToggleLabel');
  if (label) label.textContent = dark ? 'Light mode' : 'Dark mode';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0a0a0a' : '#ffffff');
  if (isNative) {
    // keep the Android status bar icons readable against the header
    SystemBars.setStyle({ style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => {});
  }
}

export function initTheme() {
  const choice = saved();
  applyTheme(choice ? choice === 'dark' : prefersDark());
}

export function toggleTheme() {
  const dark = !isDark();
  applyTheme(dark);
  try {
    localStorage.setItem(KEY, dark ? 'dark' : 'light');
  } catch (e) {
    // private mode: the choice just lasts for this visit
  }
}
