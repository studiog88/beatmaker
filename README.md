# Beatmaker

React + Vite beatmaker app with Save/Load Beats backed by Supabase.

## Local development

```bash
npm install
npm run dev
```

Open the URL shown (e.g. http://localhost:5173 or 5174).

To use **your** Supabase project: copy `.env.example` to `.env` and set `VITE_SUPABASE_PROJECT_ID` and `VITE_SUPABASE_ANON_KEY`. See [DEPLOY.md](DEPLOY.md) for the full checklist.

## Next steps: Save Beats on your Supabase

1. **Env** – Copy `.env.example` to `.env` and add your project ref and anon key.
2. **Table** – In Supabase Dashboard → SQL Editor, run the migration in `supabase/migrations/20240309000000_create_kv_store_e44554cb.sql` (or `supabase db push` after linking).
3. **Deploy function** – `supabase link --project-ref YOUR_REF` then `supabase functions deploy make-server-e44554cb` (requires [Supabase CLI](https://supabase.com/docs/guides/cli)).
4. **Test** – Log in, save a beat, open and load it.

Full step-by-step: **[DEPLOY.md](DEPLOY.md)**.

## Verify Save Beats end-to-end

1. Run the app locally (`npm run dev`), then sign up or log in.
2. Create a pattern, click **Save Beat**, enter a name, and submit.
3. Click **Open Beat** and confirm the beat appears; load it and optionally delete one to confirm list/delete.

If something fails: check the browser Network tab for `beats/save` or `beats` requests, Supabase Dashboard → Table Editor for `kv_store_e44554cb`, and Edge Function logs for the deployed function.

## Backend (Supabase)

- Create the KV table and deploy the Edge Function: see [supabase/functions/README.md](supabase/functions/README.md).
- SQL migration for the table: [supabase/migrations/20240309000000_create_kv_store_e44554cb.sql](supabase/migrations/20240309000000_create_kv_store_e44554cb.sql).
