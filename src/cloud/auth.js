import { AUTH_REDIRECT_URL } from './config.js';
import { getClient } from './supabase-remote.js';

const MIN_PASSWORD = 8;

/** Turn Supabase auth errors into short messages a farmer can act on. */
export function friendlyAuthError(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  if (msg.includes('invalid login')) return 'Wrong email or password.';
  if (msg.includes('already registered') || msg.includes('already been registered')) return 'An account with this email already exists. Try signing in.';
  if (msg.includes('email not confirmed')) return 'Please confirm your email first - check your inbox for the link.';
  if (msg.includes('password') && msg.includes('characters')) return `Password must be at least ${MIN_PASSWORD} characters.`;
  if (msg.includes('rate limit') || msg.includes('too many')) return 'Too many attempts. Please wait a minute and try again.';
  if (msg.includes('failed to fetch') || msg.includes('network')) return 'No internet connection. Please try again when online.';
  return err?.message || 'Something went wrong. Please try again.';
}

export function validateCredentials(email, password) {
  if (!/^\S+@\S+\.\S+$/.test(email || '')) return 'Enter a valid email address.';
  if ((password || '').length < MIN_PASSWORD) return `Password must be at least ${MIN_PASSWORD} characters.`;
  return null;
}

export const auth = {
  client: () => getClient(),

  async getUser() {
    const { data } = await getClient().auth.getSession();
    return data.session?.user ?? null;
  },

  onChange(callback) {
    const { data } = getClient().auth.onAuthStateChange((event, session) => callback(event, session));
    return () => data.subscription.unsubscribe();
  },

  async signUp(email, password) {
    const { data, error } = await getClient().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: AUTH_REDIRECT_URL }
    });
    if (error) throw error;
    return { needsConfirmation: !data.session };
  },

  async signIn(email, password) {
    const { error } = await getClient().auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  async sendPasswordReset(email) {
    const { error } = await getClient().auth.resetPasswordForEmail(email, { redirectTo: AUTH_REDIRECT_URL });
    if (error) throw error;
  },

  async updatePassword(password) {
    const { error } = await getClient().auth.updateUser({ password });
    if (error) throw error;
  },

  async signOut() {
    const { error } = await getClient().auth.signOut();
    if (error) throw error;
  },

  async deleteAccount() {
    const { error } = await getClient().rpc('delete_my_account');
    if (error) throw error;
    await getClient().auth.signOut().catch(() => {});
  }
};
