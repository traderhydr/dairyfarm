import { validPhoto, photoFromFile } from '../lib/photo.js';
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

/** Fill a round avatar with the photo when there is one, else with initials (set through the DOM, never as HTML). */
function paintAvatar(el, profile, photo) {
  el.textContent = '';
  if (validPhoto(photo)) {
    const img = document.createElement('img');
    img.src = photo;
    img.alt = '';
    el.appendChild(img);
    el.classList.add('has-photo');
  } else {
    el.textContent = initials(profile);
    el.classList.remove('has-photo');
  }
}

export function renderFarm() {
  const p = farmProfile();
  const hasAny = Boolean(p.ownerName || p.farmName);
  paintAvatar($('farmAvatar'), p, p.photo);
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
  let photo = '';           // the picture shown in the form; saved with the profile
  const showPhoto = () => {
    paintAvatar($('farmPhotoPreview'), { ownerName: $('farmOwnerInput').value, farmName: $('farmNameInput').value }, photo);
    $('farmPhotoRemove').classList.toggle('hidden', !validPhoto(photo));
    $('farmPhotoLabel').textContent = validPhoto(photo) ? 'Change photo' : 'Choose photo';
  };
  $('farmPhotoInput').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      photo = await photoFromFile(file);
      showPhoto();
    } catch (err) {
      showToast('Could not use that photo.');
    }
  });
  $('farmPhotoRemove').addEventListener('click', () => { photo = ''; showPhoto(); });
  const open = () => {
    const p = farmProfile();
    photo = validPhoto(p.photo) ? p.photo : '';
    $('farmOwnerInput').value = p.ownerName || '';
    $('farmNameInput').value = p.farmName || '';
    $('farmLocationInput').value = p.location || '';
    $('farmPhoneInput').value = p.phone || '';
    showPhoto();
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
      phone: $('farmPhoneInput').value.trim(),
      photo: validPhoto(photo) ? photo : ''
    };
    const existing = state.farmProfile[0];
    if (existing) Object.assign(existing, rec);
    else state.farmProfile = [{ id: 'farm', ...rec }];
    commit();
    showToast('Profile saved!');
  });
}
