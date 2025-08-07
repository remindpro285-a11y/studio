
'use server';

import { z } from "zod";
import { supabase } from "@/lib/supabase";

const settingsSchema = z.object({
  id: z.number().default(1),
  phone_number_id: z.string().min(1, "Phone Number ID is required."),
  waba_id: z.string().min(1, "WABA ID is required."),
  access_token: z.string().min(1, "Access Token is required."),
  endpoint: z.string().min(1, "Endpoint is required.").default("https://graph.facebook.com/v19.0/"),
  marks_template_name: z.string().min(1, "Marks Template Name is required."),
  fees_template_name: z.string().min(1, "Fees Template Name is required."),
});

export type SettingsFormValues = z.infer<typeof settingsSchema>;

export async function saveSettings(data: SettingsFormValues) {
    try {
        const { error } = await supabase.from('settings').upsert(data, { onConflict: 'id' });
        if (error) {
            throw error;
        }
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function testWhaConnection() {
    try {
        const { data: settings, error: fetchError } = await supabase
            .from('settings')
            .select('waba_id, access_token')
            .eq('id', 1)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found
             throw new Error(`Database Error: ${fetchError.message}`);
        }

        if (!settings || !settings.waba_id || !settings.access_token) {
            throw new Error("Settings not found or are incomplete. Please save your WABA ID and Access Token first.");
        }

        const { waba_id, access_token } = settings;
        
        // We test the connection by fetching the business profiles associated with the WABA ID
        const url = `https://graph.facebook.com/v19.0/${waba_id}/business_profiles?fields=name`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        });

        const responseData = await response.json();

        if (!response.ok) {
            const errorMessage = responseData.error?.message || `API Error: ${response.statusText}`;
            throw new Error(errorMessage);
        }

        return { success: true, data: responseData };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
