
'use server';
/**
 * @fileOverview A flow for sending WhatsApp messages via Meta's Graph API.
 *
 * - sendWhatsAppMessage - A function that sends a templated WhatsApp message.
 * - SendWhatsAppMessageInput - The input type for the sendWhatsAppMessage function.
 * - SendWhatsAppMessageOutput - The return type for the sendWhatsAppMessage function.
 */

import { supabase } from '@/lib/supabase';
import { z } from 'zod';

const SendWhatsAppMessageInputSchema = z.object({
  recipientPhoneNumber: z.string().describe('The phone number of the recipient.'),
  templateName: z.string().describe('The name of the approved WhatsApp template.'),
  parameters: z.array(z.string()).describe('The parameters to fill into the template.'),
});
export type SendWhatsAppMessageInput = z.infer<typeof SendWhatsAppMessageInputSchema>;

const SendWhatsAppMessageOutputSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});
export type SendWhatsAppMessageOutput = z.infer<typeof SendWhatsAppMessageOutputSchema>;

export async function sendWhatsAppMessage(input: SendWhatsAppMessageInput): Promise<SendWhatsAppMessageOutput> {
   try {
      const { data: settings, error: fetchError } = await supabase
        .from('settings')
        .select('phone_number_id, access_token')
        .eq('id', 1)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found, which we handle next
        throw new Error(`Database Error: ${fetchError.message}`);
      }
      
      if (!settings || !settings.phone_number_id || !settings.access_token || typeof settings.access_token !== 'string' || settings.access_token.trim() === '') {
        throw new Error('API settings not found or are incomplete in the database. Please configure a valid Phone Number ID and Access Token on the settings page.');
      }

      const { phone_number_id, access_token } = settings;

      const url = `https://graph.facebook.com/v19.0/${phone_number_id}/messages`;
      
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: input.recipientPhoneNumber,
        type: 'template',
        template: {
          name: input.templateName,
          language: {
            code: 'en_US',
          },
          components: [
            {
              type: 'body',
              parameters: input.parameters.map(param => ({ type: 'text', text: param })),
            },
          ],
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorMessage = responseData.error?.message || `API Error: ${response.statusText}`;
        const errorDetails = responseData.error?.error_data?.details ? ` Details: ${responseData.error.error_data.details}` : '';
        throw new Error(`${errorMessage}${errorDetails}`);
      }

      return { success: true };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
}
