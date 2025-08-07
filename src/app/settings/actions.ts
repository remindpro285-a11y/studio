
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
        // 1. Fetch ALL required settings from the database, including the endpoint.
        const { data: settings, error: fetchError } = await supabase
            .from('settings')
            .select('waba_id, access_token, endpoint') // Correctly fetch the endpoint
            .eq('id', 1)
            .single();

        // 2. Handle database errors during fetch.
        if (fetchError && fetchError.code !== 'PGRST116') {
             throw new Error(`Database Error: ${fetchError.message}`);
        }

        // 3. Explicitly validate that all required credentials exist and are valid strings.
        if (!settings || !settings.waba_id || typeof settings.waba_id !== 'string' || settings.waba_id.trim() === '' || !settings.access_token || typeof settings.access_token !== 'string' || settings.access_token.trim() === '' || !settings.endpoint || typeof settings.endpoint !== 'string' || settings.endpoint.trim() === '') {
            throw new Error("Settings not found or are incomplete. Please save a valid WABA ID, Access Token, and Endpoint URL first.");
        }

        const { waba_id, access_token, endpoint } = settings;
        
        // 4. Test connection by fetching business profiles using the user-provided endpoint.
        // The URL is constructed by replacing the version and phone ID part of the path with the WABA ID.
        // This makes it compatible with both direct Facebook URLs and proxy URLs like getbotify.
        const baseUrl = endpoint.split('/v')[0]; // Get the base part of the URL.
        const url = `${baseUrl.replace(/\/$/, '')}/${waba_id}/business_profiles?fields=name`;


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
        
        const businessName = responseData.data?.[0]?.name;
        if (!businessName) {
            throw new Error("Connection successful, but could not retrieve business name. Please check your WABA ID.");
        }

        return { success: true, data: responseData };

    } catch (error: any) {
        // 5. Return a structured error object for any failure.
        return { success: false, error: error.message };
    }
}
