// Lets an "add" sheet double as an "edit" sheet. A view creates one editor per form, calls
// `begin(id, fill)` from its Edit button and `find(list)` from its submit handler. Closing the
// sheet by any route (save, Escape, backdrop, tab switch) puts the form back into "add" mode.
import { openSheet } from './sheets.js';

const $ = (id) => document.getElementById(id);

/** Set a field's value; a select that lacks the value gets a temporary option so nothing is lost. */
export function setField(id, value) {
  const el = $(id);
  if (el.type === 'checkbox') {
    el.checked = Boolean(value);
    return;
  }
  const v = value === undefined || value === null ? '' : String(value);
  if (el.tagName === 'SELECT' && v && ![...el.options].some((o) => o.value === v)) {
    const option = document.createElement('option');
    option.value = v;
    option.textContent = v;
    option.dataset.temp = '1';
    el.appendChild(option);
  }
  el.value = v;
}

export function createEditor({ sheetId, formId, addOnly = [], onReset, editTitle, editLabel = 'Save Changes' }) {
  const form = $(formId);
  const title = $(`${sheetId}Title`);
  const submit = form.querySelector('button[type="submit"]');
  const addTitle = title.textContent;
  const addLabel = submit.textContent;
  let editingId = null;

  const toggleAddOnly = (hide) => addOnly.forEach((id) => {
    const wrapper = $(id).closest('div, label');
    if (wrapper) wrapper.classList.toggle('hidden', hide);
  });

  function reset() {
    if (editingId === null) return;
    editingId = null;
    title.textContent = addTitle;
    submit.textContent = addLabel;
    toggleAddOnly(false);
    form.querySelectorAll('option[data-temp]').forEach((o) => o.remove());
    form.reset();
    if (onReset) onReset();
  }

  document.addEventListener('sheetclose', (e) => {
    if (e.detail.id === sheetId) reset();
  });

  return {
    /** Open the sheet to edit record `id`; `fill` copies the record into the form fields. */
    begin(id, fill) {
      editingId = id;
      title.textContent = editTitle;
      submit.textContent = editLabel;
      toggleAddOnly(true);
      fill();
      openSheet(sheetId);
    },
    /** The record being edited from `list`, or null when adding. */
    find(list) {
      return editingId === null ? null : list.find((r) => r.id === editingId) || null;
    },
    isEditing: () => editingId !== null
  };
}

export const EDIT_BTN_CLASS = 'text-xs text-slate-500 hover:text-slate-900 font-medium px-2 py-1 rounded-lg hover:bg-slate-100 transition';
