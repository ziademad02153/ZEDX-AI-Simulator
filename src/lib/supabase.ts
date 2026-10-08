import { syncServerSession } from "./session-sync";

import { createClient } from '@supabase/supabase-js';

// These will be populated once the user provides the keys
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Warning: Client will fail if keys are missing. 
// We will ensure keys are present before using this in the app.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

if (typeof window !== "undefined") {
    supabase.auth.onAuthStateChange((_event, session) => {
        void syncServerSession(session?.access_token || null).catch(() => console.error("Server session synchronization failed"));
    });
}
