
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  FileUp,
  GraduationCap,
  Loader2,
  Send,
  Sparkles,
  RefreshCcw,
  DollarSign,
  Settings
} from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import * as XLSX from "xlsx";


import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";


type Mode = "fees" | "grades";


const MAPPING_FIELDS: Record<Mode, { key: string; label: string }[]> = {
  fees: [
    { key: "studentName", label: "Student Name" },
    { key: "className", label: "Class" },
    { key: "phoneNumber", label: "Parent Phone Number" },
    { key: "feeAmount", label: "Fee Amount" },
  ],
  grades: [
    { key: "studentName", label: "Student Name" },
    { key: "className", label: "Class" },
    { key: "phoneNumber", label: "Parent Phone Number" },
  ],
};

const TEMPLATES: Record<Mode, { id: string; name: string; text: string }[]> = {
  fees: [
    { id: "fee_reminder_1", name: "Formal Fee Reminder", text: "Dear Parent, the {{feeName}} of ₹{{feeAmount}} for your child {{studentName}} is due on {{dueDate}}. Kindly pay at your earliest convenience. Thank you, School Admin." },
    { id: "fee_reminder_2", name: "Urgent Fee Notice", text: "URGENT: The {{feeName}} of ₹{{feeAmount}} for {{studentName}} is due on {{dueDate}}. Please clear the dues to avoid late fees. Regards, Accounts Department." },
  ],
  grades: [
    { id: "grade_update_1", name: "Standard Grade Update", text: "Dear Parent, here are the grades for {{studentName}} (Class {{className}}) from the {{examName}}:\n{{gradesList}}\nCongratulations! - Principal" },
    { id: "grade_update_2", name: "Detailed Performance Report", text: "Performance Update for {{studentName}} (Class {{className}}) for {{examName}}:\n{{gradesList}}\nFor a detailed report, please visit the parent portal. Best, Examination Office." },
  ],
};

const FormSchema = z.object({
  feeName: z.string().optional(),
  dueDate: z.date().optional(),
  examName: z.string().optional(),
  templateId: z.string({ required_error: "Please select a template." }),
});

export function EduAlertDashboard() {
  const { toast } = useToast();
  const [step, setStep] = React.useState(0); // 0: Upload, 1: Map, 2: Preview
  const [mode, setMode] = React.useState<Mode>("fees");
  const [file, setFile] = React.useState<File | null>(null);
  const [data, setData] = React.useState<Record<string, any>[]>([]);
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [mappings, setMappings] = React.useState<Record<string, string>>({});
  const [finalData, setFinalData] = React.useState<Record<string, string>[]>([]);
  const [isSending, setIsSending] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [isParsing, setIsParsing] = React.useState(false);
  const ITEMS_PER_PAGE = 5;

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });
  const formWatcher = form.watch();
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setIsParsing(true);

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const arrayBuffer = event.target?.result;
          if (!arrayBuffer) {
              throw new Error("Could not read file.");
          }
          const workbook = XLSX.read(arrayBuffer, { type: 'buffer' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);
          
          if(jsonData.length === 0) {
            throw new Error("No data found in the file.");
          }
          
          setData(jsonData);
          setHeaders(Object.keys(jsonData[0]));
          setStep(1);

        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error Parsing File",
                description: error.message || "Could not process the uploaded file. Please ensure it's a valid Excel or CSV.",
            });
            reset();
        } finally {
            setIsParsing(false);
        }
      };
      reader.onerror = () => {
        toast({
            variant: "destructive",
            title: "Error Reading File",
            description: "Something went wrong while trying to read your file.",
        });
        setIsParsing(false);
      }
      reader.readAsArrayBuffer(selectedFile);
    }
  };

  const handleConfirmMapping = () => {
    const requiredFields = MAPPING_FIELDS[mode].map(f => f.key);
    const mappedFields = Object.keys(mappings);
    const allRequiredMapped = requiredFields.every(rf => mappedFields.includes(rf) && mappings[rf]);
    
    if (!allRequiredMapped) {
        toast({
            variant: "destructive",
            title: "Mapping Incomplete",
            description: "Please map all required fields for the selected mode.",
        });
        return;
    }
    setStep(2);
    form.setValue("templateId", TEMPLATES[mode][0].id);
  };
  
  React.useEffect(() => {
    if (step < 2) return;

    const template = TEMPLATES[mode].find(t => t.id === formWatcher.templateId);
    if (!template) return;
    
    const newFinalData = data.map(row => {
        let message = template.text;
        const newRow: Record<string, string> = {};

        Object.entries(mappings).forEach(([mapKey, header]) => {
            newRow[mapKey] = String(row[header] ?? '');
        });

        message = message.replace(/{{studentName}}/g, newRow.studentName || '[N/A]');
        message = message.replace(/{{className}}/g, newRow.className || '[N/A]');
        
        if (mode === 'fees') {
            message = message.replace(/{{feeName}}/g, formWatcher.feeName || '[Fee Name]');
            message = message.replace(/{{feeAmount}}/g, newRow.feeAmount || '[N/A]');
            message = message.replace(/{{dueDate}}/g, formWatcher.dueDate ? format(formWatcher.dueDate, 'PPP') : '[Due Date]');
        } else {
            const mappedHeaders = Object.values(mappings);
            const gradesList = Object.entries(row)
                .filter(([header]) => !mappedHeaders.includes(header))
                .map(([subject, grade]) => `- ${subject}: ${grade}`)
                .join('\n');
            
            message = message.replace(/{{gradesList}}/g, gradesList || 'No grades available.');
            message = message.replace(/{{examName}}/g, formWatcher.examName || '[Exam Name]');
        }
        
        return { ...newRow, phoneNumber: newRow.phoneNumber, message };
    });
    setFinalData(newFinalData);
    setCurrentPage(1);
  }, [data, mappings, step, formWatcher, mode]);

  const handleSend = async () => {
    setIsSending(true);
    toast({ title: "Dispatching Notifications", description: "Your messages are being sent..." });
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsSending(false);
    toast({
        title: "Success!",
        description: `${finalData.length} notifications have been queued for delivery.`,
        className: "bg-primary text-primary-foreground"
    });
  };

  const reset = () => {
    setStep(0);
    setFile(null);
    setData([]);
    setHeaders([]);
    setMappings({});
    setFinalData([]);
    form.reset();
  };

  const paginatedData = finalData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  const totalPages = Math.ceil(finalData.length / ITEMS_PER_PAGE);

  return (
    <Card className="w-full max-w-5xl shadow-2xl">
        <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle className="font-headline text-3xl">EduAlert</CardTitle>
                    <CardDescription>
                    Send Fee and Grade Notifications via WhatsApp
                    </CardDescription>
                </div>
                <div className="flex gap-2">
                    {step > 0 && <Button variant="outline" size="sm" onClick={reset}><RefreshCcw className="mr-2 h-4 w-4" /> Start Over</Button>}
                    <Button variant="outline" size="icon" asChild>
                        <Link href="/settings">
                            <Settings className="h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            </div>
        </CardHeader>
      
        <CardContent>
            {step === 0 && (
                <div className="text-center p-8 border-2 border-dashed rounded-lg">
                    {isParsing ? (
                        <>
                            <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin" />
                            <h3 className="mt-4 text-lg font-semibold">Parsing File...</h3>
                            <p className="mt-1 text-sm text-muted-foreground">Please wait while we read your data.</p>
                        </>
                    ) : (
                        <>
                            <FileUp className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-semibold">Upload Student Data</h3>
                            <p className="mt-1 text-sm text-muted-foreground">Upload an Excel or CSV file to begin.</p>
                            <div className="mt-6">
                                <Button asChild>
                                    <label htmlFor="file-upload">
                                        <FileUp className="mr-2 h-4 w-4"/> Choose File
                                        <Input id="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" />
                                    </label>
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            )}
            
            {step === 1 && (
                <div className="space-y-6">
                    <div>
                        <h3 className="text-xl font-semibold font-headline">Map Data Columns</h3>
                        <p className="text-muted-foreground">Match your sheet columns to the required fields for <span className="font-semibold">{file?.name}</span>.</p>
                        <Tabs value={mode} onValueChange={(v) => {
                            setMode(v as Mode);
                            setMappings({});
                        }} className="w-fit mt-4">
                            <TabsList>
                                <TabsTrigger value="fees"><DollarSign className="mr-2 h-4 w-4" />Fee Notifications</TabsTrigger>
                                <TabsTrigger value="grades"><GraduationCap className="mr-2 h-4 w-4" />Grade Reports</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {MAPPING_FIELDS[mode].map(field => (
                            <div key={field.key} className="space-y-2">
                                <Label htmlFor={`map-${field.key}`}>{field.label}</Label>
                                <Select onValueChange={value => setMappings(prev => ({ ...prev, [field.key]: value }))}>
                                    <SelectTrigger id={`map-${field.key}`}>
                                        <SelectValue placeholder="Select column from your file..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {headers.map(header => (
                                            <SelectItem key={header} value={header}>{header}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ))}
                    </div>
                     <Alert>
                        <GraduationCap className="h-4 w-4" />
                        <AlertTitle>For Grade Reports</AlertTitle>
                        <AlertDescription>
                            Any columns not mapped above will be automatically treated as subjects and their grades will be included in the message.
                        </AlertDescription>
                    </Alert>
                     <div className="flex justify-between items-center pt-4">
                        <Button variant="outline" onClick={() => reset()}><ArrowLeft className="mr-2 h-4 w-4"/> Back to Upload</Button>
                        <Button onClick={handleConfirmMapping} className="bg-accent hover:bg-accent/90">
                            Confirm Mappings & Preview <ChevronRight className="ml-2 h-4 w-4"/>
                        </Button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <Form {...form}>
                    <form className="space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1 space-y-6">
                                <h3 className="text-xl font-semibold font-headline">Configure & Send</h3>
                                
                                <FormField
                                    control={form.control}
                                    name="templateId"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Message Template</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue placeholder="Select a template" /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {TEMPLATES[mode].map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                        </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />

                                {mode === "fees" && (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="feeName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Fee Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g., Annual Tuition Fee" {...field} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="dueDate"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel>Due Date</FormLabel>
                                                <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                    <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                                </PopoverContent>
                                                </Popover>
                                            </FormItem>
                                        )}
                                    />
                                </>
                                )}

                                {mode === "grades" && (
                                     <FormField
                                        control={form.control}
                                        name="examName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Exam Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g., Mid-Term Exams" {...field} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                )}
                            </div>
                            <div className="lg:col-span-2">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-xl font-semibold font-headline">Preview</h3>
                                    <div className="text-sm text-muted-foreground">
                                        Page {currentPage} of {totalPages}
                                    </div>
                                </div>
                                <Card>
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Student</TableHead>
                                                    <TableHead>Message Preview</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                            {paginatedData.length > 0 ? paginatedData.map((row, index) => (
                                                <TableRow key={index}>
                                                    <TableCell className="font-medium w-1/3 align-top">
                                                        <div className="font-semibold">{row.studentName}</div>
                                                        <div className="text-sm text-muted-foreground">Class: {row.className}</div>
                                                        <div className="text-sm text-muted-foreground">Phone: {row.phoneNumber}</div>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{row.message}</TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow><TableCell colSpan={2} className="text-center h-24">No data to display.</TableCell></TableRow>
                                            )}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                    {totalPages > 1 && (
                                        <CardFooter className="flex justify-between items-center py-4">
                                            <div className="text-sm text-muted-foreground">Showing {paginatedData.length} of {finalData.length} records.</div>
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p-1)} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4"/></Button>
                                                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p+1)} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4"/></Button>
                                            </div>
                                        </CardFooter>
                                    )}
                                </Card>
                            </div>
                        </div>

                        <Separator/>
                        
                        <div className="flex justify-end">
                             <Button type="button" size="lg" onClick={handleSend} disabled={isSending}>
                                {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
                                Send {finalData.length} Notifications
                             </Button>
                        </div>
                    </form>
                </Form>
            )}
        </CardContent>
    </Card>
  );
}

    