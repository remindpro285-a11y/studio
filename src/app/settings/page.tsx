
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
import { Loader2, Save, Plug, MessageSquare } from "lucide-react";
import Link from "next/link";
import { saveSettings, testWhaConnection, type SettingsFormValues } from "./actions";


const settingsSchema = z.object({
  id: z.number().default(1),
  phone_number_id: z.string().min(1, "Phone Number ID is required."),
  waba_id: z.string().min(1, "WABA ID is required."),
  access_token: z.string().min(1, "Access Token is required."),
  endpoint: z.string().min(1, "Endpoint is required.").default("https://graph.facebook.com/v20.0/"),
  marks_template_name: z.string().min(1, "Marks Template Name is required."),
  fees_template_name: z.string().min(1, "Fees Template Name is required."),
});


export default function SettingsPage() {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isCheckingConnection, setIsCheckingConnection] = React.useState(false);
    const [isTestingWha, setIsTestingWha] = React.useState(false);


  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
        id: 1,
        phone_number_id: "",
        waba_id: "",
        access_token: "",
        endpoint: "https://graph.facebook.com/v20.0/",
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
            const formData = Object.fromEntries(
                Object.entries(data).map(([key, value]) => [key, value === null ? "" : value])
            );
            form.reset(formData as SettingsFormValues);
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

  async function handleTestDbConnection() {
    setIsCheckingConnection(true);
    try {
        const { error } = await supabase.from('settings').select('id').limit(1);

        if (error && error.code !== 'PGRST116') { // 'PGRST116' is 'object not found', which is ok if table is empty.
            throw error;
        }

        toast({
            title: "Connection Successful",
            description: "Successfully connected to the Supabase database.",
            className: "bg-primary text-primary-foreground",
        });

    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Connection Failed",
            description: error.message,
        });
    } finally {
        setIsCheckingConnection(false);
    }
  }

  async function handleTestWhaConnection() {
      setIsTestingWha(true);
      // Save before testing to ensure we use the latest values
      await form.handleSubmit(onSubmit)();

      const result = await testWhaConnection();
      if (result.success) {
          const businessName = result.data.data?.[0]?.name;
          toast({
              title: "WhatsApp API Connected!",
              description: businessName ? `Successfully connected to ${businessName}.` : "Connection successful.",
              className: "bg-primary text-primary-foreground"
          });
      } else {
          toast({
              variant: "destructive",
              title: "WhatsApp API Connection Failed",
              description: result.error || "An unknown error occurred.",
          });
      }
      setIsTestingWha(false);
  }

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center p-4 sm:p-8 bg-background">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader>
          <CardTitle className="font-headline text-3xl">API Settings</CardTitle>
          <CardDescription>
            Configure your WhatsApp Business API credentials and test your database connection. Go to <Link href="/" className="underline">Homepage</Link>
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
                name="endpoint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endpoint</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., https://graph.facebook.com/v20.0/" {...field} />
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
              <CardFooter className="px-0 pt-6">
                 <div className="flex w-full justify-between items-center">
                    <Button variant="outline" asChild>
                        <Link href="/">Back to Dashboard</Link>
                    </Button>
                    <div className="flex gap-2 flex-wrap justify-end">
                         <Button variant="secondary" type="button" onClick={handleTestDbConnection} disabled={isCheckingConnection}>
                            {isCheckingConnection ? <Loader2 className="animate-spin" /> : <Plug />}
                            {isCheckingConnection ? "Checking..." : "Test DB"}
                        </Button>
                        <Button variant="secondary" type="button" onClick={handleTestWhaConnection} disabled={isTestingWha || isSubmitting}>
                            {isTestingWha ? <Loader2 className="animate-spin" /> : <MessageSquare />}
                            {isTestingWha ? "Testing..." : "Test WhatsApp API"}
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin" /> : <Save />}
                            {isSubmitting ? "Saving..." : "Save Settings"}
                        </Button>
                    </div>
                </div>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}
