
"use client";

import { createBrowserClient } from '@supabase/ssr';

// This is a client-safe Supabase instance meant for use in browser components.
// It uses the public ANON_KEY, which is safe to expose.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
