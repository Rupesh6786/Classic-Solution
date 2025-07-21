
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  // This check is primarily for the server-side part.
  console.warn("Supabase URL or Service Role Key is not set in environment variables for the server-side client.");
}

// This client uses the service_role key and should ONLY be used on the server (e.g., in API routes or server actions).
// Never expose it on the client side.
export const supabaseAdmin = createClient(
    supabaseUrl || '', 
    supabaseServiceRoleKey || ''
);
