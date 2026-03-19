import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { projectId, publicAnonKey } from '/utils/supabase/info';

// Singleton Supabase client
let supabaseClient: any = null;

export function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient(
      `https://${projectId}.supabase.co`,
      publicAnonKey
    );
  }
  return supabaseClient;
}
