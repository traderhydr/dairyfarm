// Sign-in modal, header status button, and the glue between auth and the sync engine.
import { auth, friendlyAuthError, validateCredentials } from '../cloud/auth.js';
import { cloudEnabled } from '../cloud/config.js';
import { createSupabaseRemote } from '../cloud/supabase-remote.js';
import { createSyncEngine } from '../cloud/sync-engine.js';
import { onChange, replaceAll, snapshot } from '../state.js';
import { openConfirmModal } from './modal.js';
import { showToast } from './toast.js';

const $ = (id) => document.getElementById(id);

const SYNC_LABELS = {
  pending: { text: 'Saving…', dot: 'bg-amber-400' },
  syncing: { text: 'Syncing…', dot: 'bg-amber-400' },
  synced: { text: 'Synced', dot: 'bg-emerald-400' },
  offline: { text: 'Offline - will sync', dot: 'bg-slate-400' },
  error: { text: 'Sync problem - will retry', dot: 'bg-rose-500' }
};

const VIEWS = {
  signin: { title: 'Sign in', subtitle: 'Back up your farm records and use them on any phone.', submit: 'Sign in', password: 'Password', autocomplete: 'current-password' },
  signup: { title: 'Create account', subtitle: 'Free. Your records are private to you.', submit: 'Create account', password: 'Password (min. 8 characters)', autocomplete: 'new-password' },
  forgot: { title: 'Reset password', subtitle: "We'll email you a link to choose a new password.", submit: 'Send reset link' },
  recovery: { title: 'Choose a new password', subtitle: 'Enter a new password for your account.', submit: 'Save new password', password: 'New password (min. 8 characters)', autocomplete: 'new-password' },
  account: { title: 'Account', subtitle: 'Your records are backed up to your account.' }
};

let view = 'signin';
let user = null;
let engine = null;
let lastStatus = { state: 'synced' };

function setMessage(kind, text) {
  const err = $('accountError');
  const info = $('accountInfo');
  err.classList.add('hidden');
  info.classList.add('hidden');
  if (!text) return;
  const el = kind === 'error' ? err : info;
  el.textContent = text;
  el.classList.remove('hidden');
}

function showView(name) {
  view = name;
  const cfg = VIEWS[name];
  $('accountTitle').textContent = cfg.title;
  $('accountSubtitle').textContent = cfg.subtitle;
  setMessage();

  const isAccount = name === 'account';
  $('accountForm').classList.toggle('hidden', isAccount);
  $('accountPanel').classList.toggle('hidden', !isAccount);
  if (isAccount) {
    $('accountUserEmail').textContent = user?.email || '';
    renderSyncText();
    return;
  }

  $('accountEmailField').classList.toggle('hidden', name === 'recovery');
  $('accountPasswordField').classList.toggle('hidden', name === 'forgot');
  $('accountTermsField').classList.toggle('hidden', name !== 'signup');
  $('accountForgotBtn').classList.toggle('hidden', name !== 'signin');
  $('accountSwitchBtn').classList.toggle('hidden', name === 'recovery');
  $('accountSwitchBtn').textContent = name === 'signin' ? 'Create account' : 'Back to sign in';
  $('accountSubmitBtn').textContent = cfg.submit;
  if (cfg.password) {
    $('accountPasswordLabel').textContent = cfg.password;
    $('accountPassword').setAttribute('autocomplete', cfg.autocomplete);
  }
  $('accountPassword').value = '';
}

function openModal(name) {
  showView(name || (user ? 'account' : 'signin'));
  $('accountModal').classList.remove('hidden');
}

function closeModal() {
  $('accountModal').classList.add('hidden');
}

function renderSyncText() {
  const label = SYNC_LABELS[lastStatus.state] || SYNC_LABELS.synced;
  let text = label.text;
  if (lastStatus.state === 'synced' && lastStatus.at) text += ` - ${new Date(lastStatus.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  $('accountSyncText').textContent = text;
}

function renderButton() {
  const btn = $('accountBtn');
  if (!user) {
    $('accountBtnLabel').textContent = 'Sign in to back up';
    $('accountDot').className = 'w-2 h-2 rounded-full bg-slate-400';
    return;
  }
  const label = SYNC_LABELS[lastStatus.state] || SYNC_LABELS.synced;
  $('accountBtnLabel').textContent = label.text;
  $('accountDot').className = `w-2 h-2 rounded-full ${label.dot}`;
  btn.title = user.email || '';
}

function onSyncStatus(status) {
  lastStatus = status;
  renderButton();
  if (view === 'account') renderSyncText();
}

function startSync(sessionUser) {
  const supabase = auth.client();
  engine?.stop();
  engine = createSyncEngine({
    remote: createSupabaseRemote(supabase, sessionUser.id),
    getLocal: snapshot,
    applyLocal: (data) => replaceAll(data, 'remote'),
    onStatus: onSyncStatus
  });
  engine.start(sessionUser.id);
}

function handleSession(session) {
  const next = session?.user ?? null;
  if ((next?.id ?? null) === (user?.id ?? null)) {
    user = next;
    return;
  }
  user = next;
  if (user) {
    lastStatus = { state: 'syncing' };
    startSync(user);
    if (!$('accountModal').classList.contains('hidden') && view !== 'recovery') {
      showView('account');
      showToast('Signed in - syncing your records');
    }
  } else {
    engine?.stop();
    engine = null;
    lastStatus = { state: 'synced' };
    if (view === 'account') showView('signin');
  }
  renderButton();
}

async function submit(event) {
  event.preventDefault();
  const email = $('accountEmail').value.trim();
  const password = $('accountPassword').value;
  const btn = $('accountSubmitBtn');
  setMessage();

  const needsEmail = view !== 'recovery';
  const needsPassword = view !== 'forgot';
  if (needsEmail && !/^\S+@\S+\.\S+$/.test(email)) return setMessage('error', 'Enter a valid email address.');
  if (needsPassword && (view === 'signup' || view === 'recovery')) {
    const problem = validateCredentials(email || 'a@b.co', password);
    if (problem && problem.includes('Password')) return setMessage('error', problem);
  }
  if (needsPassword && view === 'signin' && !password) return setMessage('error', 'Enter your password.');
  if (view === 'signup' && !$('accountTerms').checked) return setMessage('error', 'Please accept the Privacy Policy to continue.');

  btn.disabled = true;
  try {
    if (view === 'signin') {
      await auth.signIn(email, password);
    } else if (view === 'signup') {
      const { needsConfirmation } = await auth.signUp(email, password);
      if (needsConfirmation) {
        showView('signin');
        setMessage('info', 'Account created. Check your email and tap the confirmation link, then sign in.');
      }
    } else if (view === 'forgot') {
      await auth.sendPasswordReset(email);
      showView('signin');
      setMessage('info', 'If that email has an account, a reset link is on its way.');
    } else if (view === 'recovery') {
      await auth.updatePassword(password);
      showToast('Password updated');
      showView('account');
    }
  } catch (err) {
    setMessage('error', friendlyAuthError(err));
  } finally {
    btn.disabled = false;
  }
}

function confirmSignOut() {
  const unsynced = lastStatus.state !== 'synced';
  openConfirmModal(
    'Sign out?',
    'Your records stay safe in your account and download again when you sign in. The copy on this phone will be removed.' +
      (unsynced ? ' WARNING: some recent changes have not synced yet and will be lost.' : ''),
    async () => {
      engine?.forgetBase();
      engine?.stop();
      engine = null;
      try {
        await auth.signOut();
      } catch (err) {
        showToast(friendlyAuthError(err));
        return;
      }
      user = null;
      replaceAll({}, 'signout');
      renderButton();
      closeModal();
      showToast('Signed out');
    }
  );
}

function confirmDelete() {
  openConfirmModal(
    'Delete your account?',
    'This permanently deletes your login and all cloud records, and clears this phone. It cannot be undone.',
    async () => {
      try {
        engine?.forgetBase();
        engine?.stop();
        engine = null;
        await auth.deleteAccount();
      } catch (err) {
        showToast(friendlyAuthError(err));
        if (user) startSync(user);
        return;
      }
      user = null;
      replaceAll({}, 'signout');
      renderButton();
      closeModal();
      showToast('Account deleted');
    }
  );
}

export function initAccount() {
  if (!cloudEnabled) return;

  $('accountBtn').classList.remove('hidden');
  $('accountBtn').classList.add('flex');
  $('accountBtn').addEventListener('click', () => openModal());
  $('accountCloseBtn').addEventListener('click', closeModal);
  $('accountForm').addEventListener('submit', submit);
  $('accountSwitchBtn').addEventListener('click', () => showView(view === 'signin' ? 'signup' : 'signin'));
  $('accountForgotBtn').addEventListener('click', () => showView('forgot'));
  $('accountSyncNowBtn').addEventListener('click', () => engine?.syncNow());
  $('accountSignOutBtn').addEventListener('click', confirmSignOut);
  $('accountDeleteBtn').addEventListener('click', confirmDelete);

  onChange((source) => {
    if (source === 'local') engine?.notifyLocalChange();
  });

  auth.onChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      handleSession(session);
      openModal('recovery');
      return;
    }
    handleSession(session);
  });
  auth.getUser().then((u) => {
    if (u && !user) handleSession({ user: u });
  });
}
