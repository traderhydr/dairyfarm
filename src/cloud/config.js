const env = import.meta.env;

export const CLOUD_URL = env.VITE_SUPABASE_URL || '';
export const CLOUD_KEY = env.VITE_SUPABASE_ANON_KEY || '';

/** Accounts and sync are only offered when the build was given a Supabase project. */
export const cloudEnabled = Boolean(CLOUD_URL && CLOUD_KEY);

/**
 * Where emailed links (confirm sign-up, reset password) should land. The native app runs on
 * https://localhost so it must point at the hosted web app instead.
 */
export const AUTH_REDIRECT_URL = env.VITE_AUTH_REDIRECT_URL || undefined;
