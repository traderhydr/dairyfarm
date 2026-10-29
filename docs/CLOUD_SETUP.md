# Turn on accounts and cloud sync (about 10 minutes, free tier is enough)

1. Create a project at <https://supabase.com> (choose a region close to your users).
2. **Database:** open *SQL Editor*, paste the contents of `supabase/migrations/0001_farm_data.sql`, run it.
   This creates the private `farm_data` table (each user can only read/write their own row) and the
   in-app "delete my account" function.
3. **Auth settings** (*Authentication -> Providers -> Email*):
   - Easiest for farmers: turn **off** "Confirm email" so people can sign in straight after signing up.
     Leave it on if you want verified emails (then the confirmation link opens your hosted web app).
   - *Authentication -> URL Configuration*: set **Site URL** to your hosted web app address
     (for example `https://<your-github-name>.github.io/dairyfarm/`).
     Add the same address under *Redirect URLs*. Password-reset and confirmation emails point there.
4. **Keys:** *Project Settings -> API*. Copy the **Project URL** and the **anon public** key
   (the anon key is designed to be public; row-level security protects the data. Never use the
   `service_role` key in this app).
5. In GitHub: *Settings -> Secrets and variables -> Actions -> Variables* add three **repository variables**:

   | Name | Value |
   | --- | --- |
   | `SUPABASE_URL` | the Project URL |
   | `SUPABASE_ANON_KEY` | the anon public key |
   | `AUTH_REDIRECT_URL` | your hosted web app address (same as the Site URL) |

6. Re-run the workflows (push a commit or *Actions -> Run workflow*). The app now shows
   **Sign in to back up** in the header.

For local development copy `.env.example` to `.env.local` and fill in the same three values.

## How sync behaves

- The app always works offline. Changes are saved on the phone immediately and uploaded in the
  background (header shows *Saving... / Synced / Offline*).
- If two phones change records while offline, they are merged by record when both are online
  (edits beat deletes; if both edit the same record, the phone that syncs second keeps its version).
- Signing out removes the farm data from that phone (it stays in the cloud). The app warns first if
  something has not synced yet.
- *Account -> Delete my account and data* permanently deletes the login and cloud copy.
