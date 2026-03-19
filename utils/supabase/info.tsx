/**
 * Supabase project config. Prefer environment variables so you can use your
 * own project without committing keys. Fallbacks match the original Make project.
 */
const projectId =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_PROJECT_ID
    ? import.meta.env.VITE_SUPABASE_PROJECT_ID
    : "dfvdizjesqqalytgfxjn";

const publicAnonKey =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_ANON_KEY
    ? import.meta.env.VITE_SUPABASE_ANON_KEY
    : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmdmRpemplc3FxYWx5dGdmeGpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzY5NjcsImV4cCI6MjA4ODA1Mjk2N30.y6kpPTjD2FUfB3wvkZYlPsrhCWW8HBBk4N_ZyVGid3s";

export { projectId, publicAnonKey };
