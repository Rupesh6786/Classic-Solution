
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  // This check is primarily for the server-side part.
  // The client-side part might get initialized without the service key,
  // but operations like uploads in API routes will fail safely.
  console.warn("Supabase URL or Service Role Key is not set in environment variables.");
}

// The service_role key has super admin rights and should only be used on the server.
// Never expose it on the client side.
export const supabase = createClient(
    supabaseUrl || '', 
    supabaseServiceRoleKey || ''
);
