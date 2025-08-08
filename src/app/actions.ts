
'use server';

import { supabase } from "@/lib/supabase";

// This function now runs on the server and is secure
export async function verifyPassword(password: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('settings')
        .select('lock_password')
        .eq('id', 1)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error("Error fetching lock password:", error);
        return false;
    }
    
    if (!data || !data.lock_password) {
        // If no password is set in the DB, consider it unlocked
        return true; 
    }

    return data.lock_password === password;
}
