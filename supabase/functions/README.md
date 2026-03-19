# Edge Function: make-server-e44554cb

This function handles signup, Save/Load/Delete Beats, and profile photo. The app calls it at `https://<project-ref>.supabase.co/functions/v1/make-server-e44554cb/...`.

## Deploy to your Supabase project

1. **Create the KV table** in your project (Dashboard → SQL Editor), or run migrations:
   ```sql
   CREATE TABLE IF NOT EXISTS kv_store_e44554cb (
     key TEXT NOT NULL PRIMARY KEY,
     value JSONB NOT NULL
   );
   ```

2. **Install Supabase CLI** (if needed): `npm i -g supabase`

3. **Link and deploy** from the repo root (this repo has `supabase/config.toml`; link will use it):
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   supabase functions deploy make-server-e44554cb
   ```
   If the CLI is not installed: `npm i -g supabase` or see [Supabase CLI](https://supabase.com/docs/guides/cli).

4. **Secrets**: Supabase injects `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for deployed functions. No extra secrets are required for Save Beats.

5. **Frontend**: Set `VITE_SUPABASE_PROJECT_ID` and `VITE_SUPABASE_ANON_KEY` (or edit `utils/supabase/info.tsx`) to your project so the app calls your deployed function.
