---
name: Save Beats + Supabase Setup
overview: The Beatmaker app already has Save/Load Beats and Supabase wired in code; the backend uses a KV table and an Edge Function. This plan covers local dev setup and the minimal steps to make Save Beats use your Supabase project (config, table, deploy function).
todos: []
isProject: false
---

# Beatmaker: Local Dev + Save Beats with Your Supabase

## Codebase summary

- **Stack**: React 18, Vite 6, Tailwind 4. Entry: [index.html](index.html) → [src/main.tsx](src/main.tsx) → [src/app/App.tsx](src/app/App.tsx).
- **Supabase**: Project ID and anon key are in [utils/supabase/info.tsx](utils/supabase/info.tsx) (currently hardcoded to project `dfvdizjesqqalytgfxjn`). Auth uses [src/app/utils/supabase.ts](src/app/utils/supabase.ts). Beats, signup, and profile photo call the **Edge Function** at `https://${projectId}.supabase.co/functions/v1/make-server-e44554cb/...`.
- **Save Beats flow (already implemented in code)**:
  - User clicks "Save Beat" → [SaveBeatModal](src/app/components/SaveBeatModal.tsx) → `handleSaveBeat(beatName)` in [App.tsx](src/app/App.tsx) (lines 212–248).
  - Frontend sends `POST .../beats/save` with body `{ beatName, pattern, tempo }` and header `X-Access-Token`.
  - Backend in [supabase/functions/server/index.tsx](supabase/functions/server/index.tsx) (lines 143–177): verifies user from token, then saves via `kv.set(beatId, beatData)`.
  - KV store in [supabase/functions/server/kv_store.tsx](supabase/functions/server/kv_store.tsx) reads/writes Supabase table `kv_store_e44554cb` (key TEXT, value JSONB).
- **Load/Delete**: GET `.../beats` returns full beat objects; [LoadBeatModal](src/app/components/LoadBeatModal.tsx) uses that list and DELETE `.../beats/:beatId` for delete. No separate “load one beat by ID” call.

So **Save Beats is already implemented**; making it work with **your** Supabase is about (1) local dev, (2) pointing the app at your project, (3) creating the table in your project, and (4) deploying the Edge Function to your project.

---

## 1. Local development environment

- **Install and run**
  - From repo root: `npm install` then `npm run dev` (Vite dev server).
  - No `.env` in the repo; Supabase config is in [utils/supabase/info.tsx](utils/supabase/info.tsx).
- **Optional (recommended)**  
  - Use environment variables for `projectId` and `publicAnonKey` (e.g. `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` or `VITE_SUPABASE_PROJECT_ID` + anon key) and read them in a small module that [info.tsx](utils/supabase/info.tsx) (or the app) can use, so you don’t commit your project keys and can switch projects per env.
- **Bug**  
  - [AuthModal.tsx](src/app/components/AuthModal.tsx) line 37 uses a hardcoded signup URL (`dfvdizjesqqalytgfxjn.supabase.co`). Replace with `${projectId}.supabase.co` (and same path) so signup uses the configured project.

---

## 2. Point app at your Supabase project

- **Minimal**: Put your project ref and anon key in [utils/supabase/info.tsx](utils/supabase/info.tsx) (replace `projectId` and `publicAnonKey`).  
- **Cleaner**: Drive those values from env (e.g. `import.meta.env.VITE_SUPABASE_PROJECT_ID` and `VITE_SUPABASE_ANON_KEY`) and keep a `.env.example` listing the variable names.

All beat and auth requests already use `projectId` for the base URL except the signup URL in AuthModal (fix above).

---

## 3. Create the KV table in your Supabase project

The Edge Function expects this table in **your** project. In Supabase Dashboard → SQL Editor run:

```sql
CREATE TABLE IF NOT EXISTS kv_store_e44554cb (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL
);
```

(Matches the schema in [kv_store.tsx](supabase/functions/server/kv_store.tsx).)

---

## 4. Deploy the Edge Function to your project

- The app calls the function at path `**make-server-e44554cb**` (e.g. `.../functions/v1/make-server-e44554cb/beats/save`). Supabase expects **one folder per function**, e.g. `supabase/functions/make-server-e44554cb/`.
- Current layout is `supabase/functions/server/index.tsx` and `kv_store.tsx`, which is not the default Supabase layout.

**Fewest steps:**

1. Add a function folder and entry point:
  - Create `supabase/functions/make-server-e44554cb/index.ts` that imports the Hono app from the existing server and serves it (e.g. `import { app } from "../server/index.tsx"` then `Deno.serve(app.fetch)`). That requires exporting `app` from [supabase/functions/server/index.tsx](supabase/functions/server/index.tsx) and not calling `Deno.serve` there when used as a library, **or** use a single entry file that imports both the app and the serve call from a shared module.
2. Alternatively, **move** the contents of `supabase/functions/server/` into `supabase/functions/make-server-e44554cb/` (so `make-server-e44554cb/index.tsx` and `kv_store.tsx`). Then deploy that function.
3. Install Supabase CLI, link your project (`supabase link --project-ref YOUR_REF`), then deploy:
  - `supabase functions deploy make-server-e44554cb --project-ref YOUR_REF`
4. Set secrets for the function: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (Supabase usually injects these; confirm in your project’s function settings).

After this, the frontend (using your project ID and anon key) will call **your** project’s `make-server-e44554cb` and Save Beats will persist to your Supabase (via `kv_store_e44554cb`).

---

## 5. Verify Save Beats end-to-end

1. Run app locally (`npm run dev`), log in (or sign up).
2. Create a pattern, click “Save Beat”, enter a name, submit.
3. Open “Open Beat” and confirm the beat appears; load it and delete one to confirm list/delete.

If something fails: check browser network tab for the `beats/save` or `beats` request and response; check Supabase Dashboard → Table Editor for `kv_store_e44554cb`; check Edge Function logs for the deployed function.

---

## Minimal checklist (fewest steps)


| Step | Action                                                                                                                                                                                                                        |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Run `npm install` and `npm run dev` for local dev.                                                                                                                                                                            |
| 2    | Put your Supabase project ID and anon key in [utils/supabase/info.tsx](utils/supabase/info.tsx) (or env and a tiny loader). Fix signup URL in [AuthModal.tsx](src/app/components/AuthModal.tsx) to use `projectId`.           |
| 3    | In your Supabase project, create table `kv_store_e44554cb` (key TEXT PRIMARY KEY, value JSONB).                                                                                                                               |
| 4    | Expose the Hono app under `supabase/functions/make-server-e44554cb/` (entry point that serves the existing server), then deploy with Supabase CLI and ensure function env has `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. |
| 5    | Test: log in, save a beat, open and load it.                                                                                                                                                                                  |


No frontend changes are required for the Save Beats **flow**; only configuration and backend deployment so that flow uses your Supabase project and your deployed function.