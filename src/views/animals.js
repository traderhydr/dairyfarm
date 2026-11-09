import { buildProfile, listAnimals } from '../lib/animals.js';
import { GESTATION_DAYS, pregnancyProgress } from '../lib/dates.js';
import { addDays, escapeHtml, formatCurrency, formatDisplayDate } from '../lib/format.js';
import { state } from '../state.js';
import { initListSearch, matchesSearch, noMatchHtml, searchQuery } from '../ui/list-search.js';
import { closeSheets, openSheet } from '../ui/sheets.js';
import { switchTab } from '../ui/tabs.js';

const $ = (id) => document.getElementById(id);
const KIND = { milker: 'Milker', wachi: 'Wachi', goat: 'Goat / Sheep', horse: 'Horse', other: 'Animal' };
const kindLabel = (p) => (p.goat ? p.goat.species : KIND[p.kind] || 'Animal');
// where each kind is managed: [tab, add sheet, tag input]
const HOME = {
  milker: ['milkers', 'milkersSheet', 'milkerTag'],
  wachi: ['wachi', 'wachiSheet', 'wachiTag'],
  goat: ['goats', 'goatsSheet', 'goatTag'],
  horse: ['horses', 'horsesSheet', 'horseName']
};

const chip = (text, cls = 'bg-slate-100 text-slate-700 border-slate-200') =>
  `<span class="text-[11px] font-semibold px-2 py-0.5 rounded-full border ${cls}">${text}</span>`;

function statusChip(p) {
  if (p.sold) return chip(p.soldAsCalf ? 'Sold with mother' : 'Sold', 'bg-rose-50 text-rose-700 border-rose-200');
  const prog = p.pregnancy && p.pregnancy.pregStatus === 'Confirmed Pregnant' ? pregnancyProgress(p.pregnancy.aiDate) : null;
  if (prog) return chip(`Pregnant · day ${prog.day}`, 'bg-emerald-50 text-emerald-800 border-emerald-200');
  if (p.goat || p.horse) return chip(escapeHtml(p.record.status || (p.horse ? 'Active' : 'In flock')), p.inHerd ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-rose-50 text-rose-700 border-rose-200');
  return p.inHerd ? chip('In herd') : chip('Not in herd list');
}

function animalCard(p) {
  const bits = [
    p.milker ? `${escapeHtml(p.milker.breed)}` : p.wachi ? `${escapeHtml(p.wachi.breed)}` : p.goat ? `${escapeHtml(p.goat.breed || p.goat.sex)}${(p.goat.count || 1) > 1 ? ' \u00b7 ' + p.goat.count + ' animals' : ''}` : p.horse ? `${escapeHtml(p.horse.breed || p.horse.purpose || '')}` : '',
    p.ai.length ? `${p.ai.length} AI` : '',
    p.health.length ? `${p.health.length} treatment${p.health.length === 1 ? '' : 's'}` : '',
    p.calves.length ? `${p.calves.length} calf${p.calves.length === 1 ? '' : 'ves'}` : ''
  ].filter(Boolean).join(' · ');
  return `
    <button type="button" data-open-profile="${escapeHtml(p.tag)}" class="animal-card w-full text-left p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5">
      <div class="flex flex-wrap items-center gap-2">
        <h3 class="font-bold text-slate-900 text-sm">${escapeHtml(p.tag)}</h3>
        ${chip(kindLabel(p))} ${statusChip(p)}
      </div>
      ${bits ? `<p class="text-xs text-slate-500">${bits}</p>` : ''}
    </button>`;
}

export function renderAnimals() {
  const all = listAnimals(state);
  $('animalsTabBadge').textContent = String(all.length);
  $('animalTagOptions').innerHTML = all.filter((p) => !p.sold).map((p) => `<option value="${escapeHtml(p.tag)}"></option>`).join('');

  const container = $('animalsListContainer');
  const empty = $('animalsEmptyState');
  empty.classList.toggle('hidden', all.length > 0);
  container.innerHTML = '';
  if (all.length === 0) return;

  const filter = $('animalsFilter').value;
  const query = searchQuery('animalsSearch');
  const shown = all.filter((p) => {
    if (filter === 'herd' && !p.inHerd) return false;
    if (filter === 'sold' && !p.sold) return false;
    if (filter === 'pregnant' && !(p.pregnancy && p.pregnancy.pregStatus === 'Confirmed Pregnant' && !p.sold)) return false;
    return matchesSearch([p.tag, p.record, p.dam, kindLabel(p)], query);
  });
  container.innerHTML = shown.length ? shown.map(animalCard).join('') : noMatchHtml('animalsSearch');
}

// ---------------------------------------------------------------- profile

const row = (left, right, extra = '') => `
  <div class="flex items-start justify-between gap-3 py-2 text-xs">
    <div class="min-w-0"><p class="font-semibold text-slate-800">${left}</p>${extra ? `<p class="text-slate-500 mt-0.5">${extra}</p>` : ''}</div>
    <div class="text-right shrink-0 text-slate-600">${right}</div>
  </div>`;

const section = (title, count, body, empty) => `
  <section class="space-y-1">
    <h3 class="text-[11px] font-bold uppercase tracking-wider text-slate-400">${title}${count ? ` <span class="text-slate-500">(${count})</span>` : ''}</h3>
    <div class="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white px-3">${body || `<p class="py-3 text-xs text-slate-400 italic">${empty}</p>`}</div>
  </section>`;

const profileLink = (tag, label = escapeHtml(tag)) =>
  `<button type="button" data-open-profile="${escapeHtml(tag)}" class="underline decoration-slate-300 hover:decoration-slate-600">${label}</button>`;

function salePanel(p) {
  const s = p.sales[0];
  if (!s) return '';
  const profit = (Number(s.salePrice) || 0) - (Number(s.totalCost) || 0);
  const together = p.soldAsCalf
    ? `<p class="mt-1">Sold together with her mother: ${profileLink(s.cowTag)}</p>`
    : s.withCalves && s.withCalves.length
      ? `<p class="mt-1">Sold <strong>with calf</strong>: ${s.withCalves.map((c) => profileLink(c.tag)).join(', ')}</p>`
      : '<p class="mt-1">Sold <strong>without calf</strong></p>';
  return `
    <div class="rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-xs text-rose-900 space-y-0.5">
      <p class="font-bold text-sm">Sold on ${formatDisplayDate(s.saleDate)}</p>
      <p>To ${escapeHtml(s.buyer || '')}</p>
      ${together}
      <p class="mt-1">Sale price ${formatCurrency(s.salePrice)}${p.soldAsCalf ? '' : ` · Cost ${formatCurrency(s.totalCost)} · ${profit >= 0 ? 'Profit' : 'Loss'} ${formatCurrency(Math.abs(profit))}`}</p>
    </div>`;
}

function pregnancyPanel(p) {
  const r = p.pregnancy;
  if (!r || p.sold) return '';
  const prog = pregnancyProgress(r.aiDate);
  const confirmed = r.pregStatus === 'Confirmed Pregnant';
  return `
    <div class="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs space-y-1.5">
      <div class="flex items-center justify-between gap-2">
        <p class="font-bold text-sm text-emerald-900">${escapeHtml(r.pregStatus)}</p>
        <span class="text-emerald-800">Calving ${addDays(r.aiDate, GESTATION_DAYS)}</span>
      </div>
      ${prog ? `<p class="text-emerald-900">${confirmed ? 'Pregnant' : 'Since AI'}: day ${prog.day} of ${GESTATION_DAYS} · ${prog.left > 0 ? prog.left + ' days to calving' : prog.left === 0 ? 'due today' : -prog.left + ' days overdue'}</p>
      <div class="w-full h-1.5 bg-white rounded-full overflow-hidden"><div class="h-full goal-fill rounded-full" style="width: ${prog.percent}%"></div></div>` : ''}
    </div>`;
}

function profileHtml(p) {
  const facts = [];
  if (p.milker) {
    const am = Number(p.milker.morningMilk) || 0;
    const pm = Number(p.milker.eveningMilk) || 0;
    facts.push(['Milk per day', `${am + pm} L (${am} AM + ${pm} PM)`], ['Status', escapeHtml(p.milker.status)], ['Breed', escapeHtml(p.milker.breed)]);
  } else if (p.wachi) {
    facts.push(['Age', `${p.wachi.ageMonths} months`], ['Weight', `${p.wachi.weightKg} kg`], ['Stage', escapeHtml(p.wachi.stage)], ['Breed', escapeHtml(p.wachi.breed)]);
  } else if (p.goat) {
    const g = p.goat;
    facts.push(['Species', escapeHtml(g.species)], ['Gender', escapeHtml(g.sex)], ['Number', String(g.count || 1)]);
    if (g.breed) facts.push(['Breed', escapeHtml(g.breed)]);
    if (g.ageMonths) facts.push(['Age', `${g.ageMonths} months`]);
    if (g.weightKg) facts.push(['Weight', `${g.weightKg} kg`]);
    if (g.cost) facts.push(['Cost', formatCurrency(g.cost)]);
    if (g.salePrice) facts.push(['Sale price', formatCurrency(g.salePrice)]);
  } else if (p.horse) {
    const hs = p.horse;
    facts.push(['Gender', escapeHtml(hs.sex)], ['Purpose', escapeHtml(hs.purpose || '')]);
    if (hs.breed) facts.push(['Breed', escapeHtml(hs.breed)]);
    if (hs.ageYears) facts.push(['Age', `${hs.ageYears} years`]);
    if (hs.color) facts.push(['Colour', escapeHtml(hs.color)]);
    if (hs.monthlyCost) facts.push(['Feed & care / month', formatCurrency(hs.monthlyCost)]);
    if (hs.cost) facts.push(['Purchase cost', formatCurrency(hs.cost)]);
    if (hs.salePrice) facts.push(['Sale price', formatCurrency(hs.salePrice)]);
  } else if (p.sales[0] && p.sales[0].animal) {
    const a = p.sales[0].animal;
    facts.push(['Breed', escapeHtml(a.breed || '')]);
    if (a.ageMonths) facts.push(['Age when sold', `${a.ageMonths} months`]);
    if (a.morningMilk || a.eveningMilk) facts.push(['Milk when sold', `${(Number(a.morningMilk) || 0) + (Number(a.eveningMilk) || 0)} L/day`]);
  }
  const mother = p.dam ? ['Mother', profileLink(p.dam)] : null;
  if (mother) facts.push(mother);
  const notes = (p.record && p.record.notes) || '';

  const ai = p.ai.map((r) => row(
    `${formatDisplayDate(r.aiDate)} · ${escapeHtml(r.semenBull || 'Bull not noted')}`,
    escapeHtml(r.pregStatus),
    [r.pregStatus === 'Calved' ? '' : `Expected calving ${addDays(r.aiDate, GESTATION_DAYS)}`, r.notes ? escapeHtml(r.notes) : ''].filter(Boolean).join(' · ')
  )).join('');

  const health = p.health.map((h) => row(
    `${formatDate(h.dateGiven)} · ${escapeHtml(h.type)}`,
    h.cost ? formatCurrency(h.cost) : '',
    [h.disease ? `Disease: ${escapeHtml(h.disease)}` : '', h.medicine ? escapeHtml(h.medicine) : ''].filter(Boolean).join(' · ')
  )).join('');

  const calves = p.calves.map((c) => {
    const status = c.sale
      ? `Sold ${formatDisplayDate(c.sale.saleDate)}${c.sale.withCalves && c.sale.withCalves.some((x) => x.tag === c.tag) ? ' with mother' : ''}`
      : c.inHerd ? `In herd${c.stage ? ' · ' + escapeHtml(c.stage) : ''}` : 'Not in herd list';
    return row(
      profileLink(c.tag),
      status,
      [c.born ? `Born ${formatDisplayDate(c.born)}` : '', c.weightKg ? `${c.weightKg} kg` : ''].filter(Boolean).join(' · ')
    );
  }).join('');

  const cattle = p.kind === 'milker' || p.kind === 'wachi' || p.kind === 'other';
  const editBtn = p.record
    ? `<button type="button" data-profile-action="edit" class="btn-secondary text-xs py-2.5">Edit</button>`
    : '';
  const actions = `
    <div class="grid grid-cols-2 gap-2 pt-1">
      ${editBtn}
      ${p.sold ? '' : '<button type="button" data-profile-action="treat" class="btn-secondary text-xs py-2.5">+ Treatment</button>'}
      ${p.sold || !cattle ? '' : '<button type="button" data-profile-action="ai" class="btn-secondary text-xs py-2.5">+ AI record</button>'}
      ${p.sold ? '' : '<button type="button" data-profile-action="sell" class="btn-primary text-xs py-2.5">Mark sold</button>'}
    </div>
    ${!p.record && !p.sold ? `
    <div class="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900 space-y-2">
      <p>${escapeHtml(p.tag)} is not in your herd list yet. Add her so her details are kept:</p>
      <div class="flex flex-wrap gap-2">
        <button type="button" data-profile-add="milker" class="btn-secondary text-xs py-2 px-3">As Milker</button>
        <button type="button" data-profile-add="wachi" class="btn-secondary text-xs py-2 px-3">As Wachi</button>
      </div>
    </div>` : ''}`;

  return `
    <div class="pr-16 space-y-1.5" data-profile-tag="${escapeHtml(p.tag)}">
      <h2 id="profileTitle" class="text-lg font-bold text-slate-900">${escapeHtml(p.tag)}</h2>
      <div class="flex flex-wrap gap-1.5">${chip(kindLabel(p))} ${statusChip(p)}</div>
    </div>
    ${salePanel(p)}
    ${pregnancyPanel(p)}
    ${facts.length ? `<dl class="grid grid-cols-2 gap-2">${facts.map(([k, v]) => `
      <div class="bg-slate-50 border border-slate-200 rounded-lg p-2.5"><dt class="text-[10px] uppercase font-semibold text-slate-400">${k}</dt><dd class="text-xs font-bold text-slate-800 mt-0.5">${v}</dd></div>`).join('')}</dl>` : ''}
    ${notes ? `<p class="text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200/60"><strong>Notes:</strong> ${escapeHtml(notes)}</p>` : ''}
    ${actions}
    ${cattle ? section('AI &amp; pregnancy history', p.ai.length, ai, 'No AI records for this animal.') : ''}
    ${cattle ? section('Calves (baby record)', p.calves.length, calves, 'No calves recorded.') : ''}
    ${section('Treatments &amp; vaccinations', p.health.length, health, 'No treatments recorded. Use the same tag when you add a health record.')}`;
}

const formatDate = formatDisplayDate;

export function openProfile(tag) {
  $('profileBody').innerHTML = profileHtml(buildProfile(tag, state));
  openSheet('profileSheet');
}

function startAction(action, p) {
  closeSheets();
  if (action === 'treat') {
    switchTab('health');
    openSheet('healthSheet');
    $('healthTarget').value = p.tag;
  } else if (action === 'ai') {
    switchTab('breeding');
    openSheet('breedingSheet');
    $('cowTag').value = p.tag;
  } else if (action === 'edit') {
    const [tab] = HOME[p.kind] || [];
    if (!tab || !p.record) return;
    switchTab(tab);
    document.dispatchEvent(new CustomEvent('animal-edit', { detail: { kind: p.kind, id: p.record.id } }));
  } else if (action === 'sell') {
    switchTab('sales');
    openSheet('salesSheet');
    const pick = $('saleQuickPick');
    const value = p.milker ? `milker:${p.milker.id}` : p.wachi ? `wachi:${p.wachi.id}` : p.goat ? `goat:${p.goat.id}` : p.horse ? `horse:${p.horse.id}` : '';
    if (value && [...pick.options].some((o) => o.value === value)) {
      pick.value = value;
      pick.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      $('saleCowTag').value = p.tag;
      $('saleCowTag').dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
}

/** Open the add form for one kind of animal, optionally with the tag already filled in. */
export function startAdd(kind, tag = '') {
  const [tab, sheet, input] = HOME[kind];
  closeSheets();
  switchTab(tab);
  openSheet(sheet);
  if (tag) $(input).value = tag;
}

export function initAnimals() {
  initListSearch('animalsSearch', renderAnimals);
  $('animalsFilter').addEventListener('change', renderAnimals);

  document.addEventListener('click', (e) => {
    const open = e.target.closest('[data-open-profile]');
    if (open) {
      openProfile(open.getAttribute('data-open-profile'));
      return;
    }
    const add = e.target.closest('[data-add-animal]');
    if (add) {
      startAdd(add.getAttribute('data-add-animal'));
      return;
    }
    const addFromProfile = e.target.closest('[data-profile-add]');
    if (addFromProfile) {
      const tag = $('profileBody').querySelector('[data-profile-tag]').getAttribute('data-profile-tag');
      startAdd(addFromProfile.getAttribute('data-profile-add'), tag);
      return;
    }
    const action = e.target.closest('[data-profile-action]');
    if (action) {
      const tag = $('profileBody').querySelector('[data-profile-tag]').getAttribute('data-profile-tag');
      startAction(action.getAttribute('data-profile-action'), buildProfile(tag, state));
    }
  });
}
