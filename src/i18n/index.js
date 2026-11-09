// Urdu / English. English is the source language: the DOM is translated in place from a dictionary
// (`ur.json`, exact text) plus number-aware patterns, so views keep producing plain English and
// stored data is never translated. A MutationObserver translates anything the app renders later.
import { PATTERNS } from './patterns.js';
import ur from './ur.json';

const KEY = 'dairy_farm_lang';
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'NOSCRIPT', 'CODE']);
const ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];

let lang = 'en';
const textState = new WeakMap();   // text node -> { src, out }
const attrState = new WeakMap();   // element -> { attr: { src, out } }
let observer = null;
let fontLoaded = false;

export const getLang = () => lang;
export const isRtl = () => lang === 'ur';

export function savedLang() {
  try { const v = localStorage.getItem(KEY); return v === 'ur' || v === 'en' ? v : null; } catch (e) { return null; }
}

const norm = (s) => s.replace(/\s+/g, ' ').trim();

/** Urdu for an English string, or null when there is no translation. */
export function translate(text) {
  const key = norm(text);
  if (!key) return null;
  let out = ur[key];
  if (out === undefined) {
    for (const [re, tpl] of PATTERNS) {
      const m = re.exec(key);
      // a pattern whose captured text spans several "a • b" parts is wrong; those strings are translated part by part
      const multi = m && !/[•·]/.test(re.source) && m.slice(1).some((g) => g && /[•·]/.test(g));
      if (m && !multi) {
        out = tpl.replace(/\$(\d)/g, (_, i) => {
          const part = m[Number(i)] || '';
          return ur[part] ?? part;
        });
        break;
      }
    }
  }
  if (out === undefined && /[•·]/.test(key)) {
    // "Goat • Female • Beetal": translate each part on its own
    const parts = key.split(/\s*([•·])\s*/);
    let hit = false;
    const joined = parts.map((part) => {
      if (part === '•' || part === '·') return ` ${part} `;
      const tr = part ? translate(part) : null;
      if (tr !== null) hit = true;
      return tr ?? part;
    }).join('');
    if (hit) out = joined;
  }
  return out === undefined ? null : out;
}

/** Translate a string from code (toasts, labels); returns it unchanged in English mode. */
export function t(text) {
  return lang === 'ur' ? translate(text) ?? text : text;
}

function translateTextNode(node) {
  const value = node.nodeValue;
  const known = textState.get(node);
  if (known && known.out === value) return;                 // our own write
  const out = translate(value);
  if (out === null) { textState.delete(node); return; }
  const lead = value.match(/^\s*/)[0];
  const trail = value.match(/\s*$/)[0];
  textState.set(node, { src: value, out: lead + out + trail });
  node.nodeValue = lead + out + trail;
}

function translateAttrs(el) {
  for (const attr of ATTRS) {
    if (!el.hasAttribute(attr)) continue;
    const value = el.getAttribute(attr);
    const state = attrState.get(el) || {};
    if (state[attr] && state[attr].out === value) continue;
    const out = translate(value);
    if (out === null) { delete state[attr]; continue; }
    state[attr] = { src: value, out };
    attrState.set(el, state);
    el.setAttribute(attr, out);
  }
}

function skipped(node) {
  const el = node.nodeType === 1 ? node : node.parentElement;
  return !el || SKIP_TAGS.has(el.tagName) || Boolean(el.closest('[data-no-i18n]'));
}

function walk(root) {
  if (root.nodeType === 3) { if (!skipped(root)) translateTextNode(root); return; }
  if (root.nodeType !== 1 || skipped(root)) return;
  translateAttrs(root);
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n = tw.nextNode();
  while (n) {
    if (n.nodeType === 3) { if (!skipped(n)) translateTextNode(n); } else if (!skipped(n)) translateAttrs(n);
    n = tw.nextNode();
  }
}

function restore(root) {
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n = tw.nextNode();
  while (n) {
    if (n.nodeType === 3) {
      const s = textState.get(n);
      if (s && s.out === n.nodeValue) n.nodeValue = s.src;
      textState.delete(n);
    } else {
      const s = attrState.get(n);
      if (s) {
        for (const [attr, v] of Object.entries(s)) if (n.getAttribute(attr) === v.out) n.setAttribute(attr, v.src);
        attrState.delete(n);
      }
    }
    n = tw.nextNode();
  }
}

function startObserver() {
  if (observer) return;
  observer = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'childList') r.addedNodes.forEach((n) => walk(n));
      else if (r.type === 'characterData') walk(r.target);
      else if (r.type === 'attributes' && r.target.nodeType === 1 && !skipped(r.target)) translateAttrs(r.target);
    }
    observer.takeRecords();   // forget the changes we just made ourselves
  });
  observer.observe(document.body, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ATTRS });
}

function stopObserver() {
  if (observer) { observer.disconnect(); observer = null; }
}

async function loadFont() {
  if (fontLoaded) return;
  fontLoaded = true;
  try { await import('@fontsource-variable/noto-naskh-arabic/index.css'); } catch (e) { fontLoaded = false; }
}

/** Switch the whole app to `next` ('ur' or 'en'). */
export function setLang(next, { remember = true } = {}) {
  const changed = next !== lang;
  lang = next === 'ur' ? 'ur' : 'en';
  if (remember) { try { localStorage.setItem(KEY, lang); } catch (e) { /* private mode */ } }
  const html = document.documentElement;
  html.lang = lang;
  html.dir = lang === 'ur' ? 'rtl' : 'ltr';
  html.classList.toggle('lang-ur', lang === 'ur');
  if (lang === 'ur') {
    loadFont();
    walk(document.body);
    startObserver();
  } else {
    stopObserver();
    restore(document.body);
  }
  const btn = document.getElementById('langToggleBtn');
  if (btn) btn.textContent = lang === 'ur' ? 'English' : 'اردو';
  html.classList.remove('i18n-pending');
  if (changed) document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
}

/** Language screen on first run, the toggle button, and the saved language. */
export function initI18n() {
  const saved = savedLang();
  const gate = document.getElementById('languageGate');
  const choose = (value) => {
    setLang(value);
    if (gate) gate.classList.add('hidden');
  };
  if (saved) {
    setLang(saved, { remember: false });
    if (gate) gate.classList.add('hidden');
  } else {
    setLang('en', { remember: false });
    if (gate) gate.classList.remove('hidden');
  }
  document.querySelectorAll('[data-choose-lang]').forEach((b) => {
    b.addEventListener('click', () => choose(b.getAttribute('data-choose-lang')));
  });
  const toggle = document.getElementById('langToggleBtn');
  if (toggle) toggle.addEventListener('click', () => setLang(lang === 'ur' ? 'en' : 'ur'));
}
