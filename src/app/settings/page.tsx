
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
import { Loader2, Save, Plug, MessageSquare, Eye, EyeOff, Lock, Unlock } from "lucide-react";
import Link from "next/link";
import { saveSettings, testWhaConnection, type SettingsFormValues } from "./actions";
import { verifyPassword } from "../actions";

const settingsSchema = z.object({
  id: z.number().default(1),
  phone_number_id: z.string().min(1, "Phone Number ID is required."),
  waba_id: z.string().min(1, "WABA ID is required."),
  access_token: z.string().min(1, "Access Token is required."),
  endpoint: z.string().min(1, "Endpoint is required.").default("https://graph.facebook.com/v19.0/"),
  marks_template_name: z.string().min(1, "Marks Template Name is required."),
  fees_template_name: z.string().min(1, "Fees Template Name is required."),
});


export default function SettingsPage() {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isCheckingConnection, setIsCheckingConnection] = React.useState(false);
    const [isTestingWha, setIsTestingWha] = React.useState(false);
    const [showToken, setShowToken] = React.useState(false);
    
    const [isUnlocked, setIsUnlocked] = React.useState(false);
    const [password, setPassword] = React.useState("");
    const [isVerifying, setIsVerifying] = React.useState(false);
    const [showPassword, setShowPassword] = React.useState(false);
    const [isPasswordSet, setIsPasswordSet] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(true);


  const form = useForm<Omit<SettingsFormValues, 'lock_password'>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
        id: 1,
        phone_number_id: "",
        waba_id: "",
        access_token: "",
        endpoint: "https://graph.facebook.com/v19.0/",
        marks_template_name: "",
        fees_template_name: "",
    },
  });

  React.useEffect(() => {
    async function fetchSettings() {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('settings')
            .select('*')
            .eq('id', 1)
            .single();

        if (data) {
            if (data.lock_password) {
                setIsPasswordSet(true);
            } else {
                setIsUnlocked(true);
            }

            const formData: Omit<SettingsFormValues, 'lock_password'> = {
                id: data.id || 1,
                phone_number_id: data.phone_number_id || "",
                waba_id: data.waba_id || "",
                access_token: data.access_token || "",
                endpoint: data.endpoint || "https://graph.facebook.com/v19.0/",
                marks_template_name: data.marks_template_name || "",
                fees_template_name: data.fees_template_name || "",
            };
            form.reset(formData);
        } else if(error && error.code !== 'PGRST116') { 
             toast({
                variant: "destructive",
                title: "Error fetching settings",
                description: error.message,
            });
        }
        setIsLoading(false);
    }
    fetchSettings();
  }, [form, toast]);


  async function onSubmit(values: Omit<SettingsFormValues, 'lock_password'>) {
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

        if (error && error.code !== 'PGRST116') { 
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
      
      await form.handleSubmit(onSubmit)();

      const result = await testWhaConnection();
      if (result.success) {
          const businessName = result.data?.verified_name;
          toast({
              title: "WhatsApp API Connected!",
              description: businessName ? `Successfully connected to: ${businessName}.` : "Connection successful.",
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

  const handlePasswordVerification = async () => {
    setIsVerifying(true);
    const isCorrect = await verifyPassword(password);
    if(isCorrect) {
        setIsUnlocked(true);
        toast({ 
            title: "Unlocked", 
            description: "Settings are now accessible.", 
            className: "bg-primary text-primary-foreground",
            duration: 3000,
        });
    } else {
        toast({ variant: "destructive", title: "Incorrect Password", description: "The password you entered is incorrect."});
    }
    setIsVerifying(false);
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
        {isLoading ? (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin" />
            </div>
        ) : !isUnlocked ? (
            <div className="text-center p-8 border-2 border-dashed rounded-lg">
                <div className="max-w-sm mx-auto">
                    <Lock className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">Settings Locked</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Enter the password to view or edit settings.</p>
                    <div className="mt-4 flex gap-2">
                        <div className="relative flex-grow">
                            <Input 
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handlePasswordVerification()}
                                className="pr-10"
                            />
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm" 
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(prev => !prev)}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                        </div>
                        <Button onClick={handlePasswordVerification} disabled={isVerifying}>
                            {isVerifying ? <Loader2 className="animate-spin"/> : <Unlock />}
                            Unlock
                        </Button>
                    </div>
                </div>
            </div>
        ) : (
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
                      <div className="relative">
                         <Input 
                            type={showToken ? "text" : "password"} 
                            placeholder="Your Access Token" 
                            {...field} 
                            className="pr-10"
                         />
                         <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowToken(prev => !prev)}
                          >
                            {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Enter your permanent access token.
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
                      <Input placeholder="e.g., https://graph.facebook.com/v19.0/" {...field} />
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
        )}
        </CardContent>
      </Card>
    </main>
  );
}
