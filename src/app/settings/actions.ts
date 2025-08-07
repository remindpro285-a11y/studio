
'use server';

import { z } from "zod";
import { supabase } from "@/lib/supabase";

const settingsSchema = z.object({
  id: z.number().default(1),
  phone_number_id: z.string().min(1, "Phone Number ID is required."),
  waba_id: z.string().min(1, "WABA ID is required."),
  access_token: z.string().min(1, "Access Token is required."),
  endpoint: z.string().min(1, "Endpoint is required.").default("https://graph.facebook.com/v20.0/"),
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
            .select('*')
            .eq('id', 1)
            .single();

        if (fetchError || !settings) {
            throw new Error(fetchError?.message || "Settings not found. Please save your settings first.");
        }

        const { waba_id, access_token, endpoint } = settings;
        
        if (!waba_id || !access_token || !endpoint) {
             throw new Error("WABA ID, Access Token, and Endpoint are required.");
        }

        // We can test the connection by trying to fetch the business profile name
        const url = `${endpoint.replace(/\/$/, '')}/${waba_id}?fields=name`;

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
        
        // The API returns a list of profiles, we are interested in the first one
        const businessProfilesUrl = `${endpoint.replace(/\/$/, '')}/${waba_id}/business_profiles`;
        const profilesResponse = await fetch(businessProfilesUrl, {
             headers: {
                'Authorization': `Bearer ${access_token}`
            }
        });
        const profilesData = await profilesResponse.json();

        if(!profilesResponse.ok) {
            const errorMessage = profilesData.error?.message || `API Error: ${profilesResponse.statusText}`;
            throw new Error(`Could not fetch business profiles: ${errorMessage}`);
        }

        return { success: true, data: profilesData };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
