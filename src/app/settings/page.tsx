"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import React from "react";
import { Loader2, Save } from "lucide-react";
import Link from "next/link";


const settingsSchema = z.object({
  id: z.number().default(1),
  phone_number_id: z.string().min(1, "Phone Number ID is required."),
  waba_id: z.string().min(1, "WABA ID is required."),
  access_token: z.string().min(1, "Access Token is required."),
  api_version: z.string().min(1, "API Version is required.").default("v20.0"),
  marks_template_name: z.string().min(1, "Marks Template Name is required."),
  fees_template_name: z.string().min(1, "Fees Template Name is required."),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

async function saveSettings(data: SettingsFormValues) {
    'use server';
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

export default function SettingsPage() {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
        id: 1,
        phone_number_id: "",
        waba_id: "",
        access_token: "",
        api_version: "v20.0",
        marks_template_name: "",
        fees_template_name: ""
    },
  });

  React.useEffect(() => {
    async function fetchSettings() {
        const { data, error } = await supabase
            .from('settings')
            .select('*')
            .eq('id', 1)
            .single();

        if (data) {
            form.reset(data);
        } else if(error && error.code !== 'PGRST116') { // Ignore no rows found error
             toast({
                variant: "destructive",
                title: "Error fetching settings",
                description: error.message,
            });
        }
    }
    fetchSettings();
  }, [form, toast]);


  async function onSubmit(values: SettingsFormValues) {
    setIsSubmitting(true);
    const result = await saveSettings(values);
    setIsSubmitting(false);

    if (result.success) {
        toast({
            title: "Settings Saved",
            description: "Your credentials have been successfully saved.",
            className: "bg-primary text-primary-foreground"
        });
    } else {
        toast({
            variant: "destructive",
            title: "Error saving settings",
            description: result.error,
        });
    }
  }

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center p-4 sm:p-8 bg-gray-50">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader>
          <CardTitle className="font-headline text-3xl">API Settings</CardTitle>
          <CardDescription>
            Configure your WhatsApp Business API credentials.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="phone_number_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Phone Number ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="waba_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WABA ID (WhatsApp Business Account ID)</FormLabel>
                    <FormControl>
                      <Input placeholder="Your WABA ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="access_token"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Access Token</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Your Access Token" {...field} />
                    </FormControl>
                    <FormDescription>
                      Your token is stored securely and is not displayed here.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="api_version"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Version</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., v20.0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="fees_template_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fees Template Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Template for fee reminders" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="marks_template_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marks Template Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Template for grade updates" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <CardFooter className="px-0 pt-6 flex justify-between">
                <Button variant="outline" asChild>
                    <Link href="/">Back to Dashboard</Link>
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                  Save Settings
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}
