import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://chracsjlsiynwflzznxa.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNocmFjc2psc2l5bndmbHp6bnhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2ODM3NzYsImV4cCI6MjEwODI1OTc3Nn0.09duApqZRzqC-kkikgwTIp8B5uyeheQmmw584Y8HptM";

export function createClient() {
  return createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
}
