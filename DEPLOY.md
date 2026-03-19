# Deploy Save Beats to your Supabase project

Follow these steps so the app uses **your** Supabase project for auth and Save/Load Beats.

## 1. Point the app at your project

Copy the env example and set your project credentials (get them from [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Project Settings** → **API**):

```bash
cp .env.example .env
```

Edit `.env` and set:

- `VITE_SUPABASE_PROJECT_ID` = your project ref (e.g. `abcdefghijklmnop`)
- `VITE_SUPABASE_ANON_KEY` = your project’s anon/public key

Restart the dev server (`npm run dev`) after changing `.env`.

## 2. Create the KV table in your project

In Supabase Dashboard → **SQL Editor**, run:

```sql
CREATE TABLE IF NOT EXISTS kv_store_e44554cb (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL
);
```

Or, if you use the Supabase CLI and have linked your project (step 3):

```bash
supabase db push
```

(The migration file is `supabase/migrations/20240309000000_create_kv_store_e44554cb.sql`.)

## 3. Deploy the Edge Function

Install the CLI if needed, then link and deploy from the **repo root**:

```bash
# Install CLI (one of):
npm i -g supabase
# or: brew install supabase/tap/supabase

# Link your project (use your project ref from Dashboard → Project Settings → General)
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
supabase functions deploy make-server-e44554cb
```

Supabase will prompt for your database password when linking if required. The deployed function gets `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` automatically.

## 4. Test Save Beats

1. Run the app: `npm run dev`
2. Sign up or log in (hits your project’s auth and the deployed signup/beats endpoints).
3. Create a pattern → **Save Beat** → enter a name → Save.
4. **Open Beat** → your saved beat should appear; load it and optionally delete one.

If something fails:

- **Network tab**: check `beats/save` and `beats` for status and response body.
- **Supabase Dashboard**: Table Editor → `kv_store_e44554cb` for saved rows; Edge Functions → `make-server-e44554cb` → Logs.
