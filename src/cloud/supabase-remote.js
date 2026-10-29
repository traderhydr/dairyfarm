import { createClient } from '@supabase/supabase-js';
import { CLOUD_KEY, CLOUD_URL } from './config.js';

let client = null;

export function getClient() {
  if (!client) {
    client = createClient(CLOUD_URL, CLOUD_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
  }
  return client;
}

const UNIQUE_VIOLATION = '23505';

/** Sync-engine remote backed by the `farm_data` row of one user. */
export function createSupabaseRemote(supabase, userId) {
  return {
    async fetch() {
      const { data, error } = await supabase
        .from('farm_data')
        .select('data,version')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data ? { data: data.data, version: data.version } : null;
    },

    async push(data, expectedVersion) {
      if (expectedVersion === 0) {
        const { error } = await supabase.from('farm_data').insert({ user_id: userId, data, version: 1 });
        if (!error) return { ok: true, version: 1 };
        if (error.code === UNIQUE_VIOLATION) return { ok: false };
        throw error;
      }
      const { data: rows, error } = await supabase
        .from('farm_data')
        .update({ data, version: expectedVersion + 1 })
        .eq('user_id', userId)
        .eq('version', expectedVersion)
        .select('version');
      if (error) throw error;
      return rows && rows.length ? { ok: true, version: rows[0].version } : { ok: false };
    },

    subscribe(onChange) {
      const channel = supabase
        .channel(`farm_data:${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'farm_data', filter: `user_id=eq.${userId}` },
          onChange
        )
        .subscribe();
      return () => supabase.removeChannel(channel);
    }
  };
}
