import { commit, state } from '../state.js';
import { openSheet } from '../ui/sheets.js';
import { showToast } from '../ui/toast.js';

const $ = (id) => document.getElementById(id);

export const farmProfile = () => state.farmProfile[0] || {};

/** One or two capital letters for the round avatar: farm name first, then the person's name. */
export function initials(profile) {
  const words = String(profile.farmName || profile.ownerName || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '+';
  return words.slice(0, 2).map((w) => Array.from(w)[0].toUpperCase()).join('');
}

export function renderFarm() {
  const p = farmProfile();
  const hasAny = Boolean(p.ownerName || p.farmName);
  $('farmAvatar').textContent = initials(p);
  $('farmCard').classList.toggle('farm-empty', !hasAny);
  if (!hasAny) {
    $('farmGreeting').textContent = 'Set up your farm';
    $('farmName').textContent = 'Add your name and your farm name';
    $('farmMeta').classList.add('hidden');
    return;
  }
  if (p.ownerName) {
    $('farmGreeting').textContent = `Hi, ${p.ownerName}`;
    $('farmName').textContent = p.farmName || '';
  } else {
    $('farmGreeting').textContent = p.farmName;
    $('farmName').textContent = '';
  }
  $('farmName').classList.toggle('hidden', !$('farmName').textContent);
  const meta = [p.location, p.phone].filter(Boolean).join(' \u00b7 ');
  $('farmMeta').textContent = meta;
  $('farmMeta').classList.toggle('hidden', !meta);
}

export function initFarm() {
  const open = () => {
    const p = farmProfile();
    $('farmOwnerInput').value = p.ownerName || '';
    $('farmNameInput').value = p.farmName || '';
    $('farmLocationInput').value = p.location || '';
    $('farmPhoneInput').value = p.phone || '';
    openSheet('farmSheet');
  };
  $('editFarmBtn').addEventListener('click', open);
  $('farmCard').addEventListener('click', (e) => { if (!e.target.closest('#editFarmBtn')) open(); });

  $('farmForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const rec = {
      ownerName: $('farmOwnerInput').value.trim().replace(/\s+/g, ' '),
      farmName: $('farmNameInput').value.trim().replace(/\s+/g, ' '),
      location: $('farmLocationInput').value.trim(),
      phone: $('farmPhoneInput').value.trim()
    };
    const existing = state.farmProfile[0];
    if (existing) Object.assign(existing, rec);
    else state.farmProfile = [{ id: 'farm', ...rec }];
    commit();
    showToast('Profile saved!');
  });
}
