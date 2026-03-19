-- Required for Save Beats (and profile photo URL). Run in Supabase Dashboard → SQL Editor
-- if not using Supabase CLI migrations.
CREATE TABLE IF NOT EXISTS kv_store_e44554cb (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL
);
