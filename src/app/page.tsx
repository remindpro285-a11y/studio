
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
  RefreshCcw,
  DollarSign,
  MessageSquareText,
  Check,
  FileCheck2,
  ListOrdered,
  SendHorizontal,
  CircleAlert,
  CheckCircle,
  XCircle,
} from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import * as XLSX from "xlsx";
import { sendWhatsAppMessage, type SendWhatsAppMessageInput } from "@/ai/flows/send-whatsapp-flow";

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
import { supabase } from "@/lib/supabase";
import type { SettingsFormValues } from "@/app/settings/actions";
import { AnimatePresence, motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";

type Mode = "fees" | "grades";

const ITEMS_PER_PAGE = 5;

const MAPPING_FIELDS: Record<Mode, { key: string; label: string; searchTerms: string[] }[]> = {
  fees: [
    { key: "studentName", label: "Student Name*", searchTerms: ["student", "name"] },
    { key: "className", label: "Class*", searchTerms: ["class", "grade", "standard"] },
    { key: "phoneNumber", label: "Parent Phone Number*", searchTerms: ["phone", "mobile", "contact"] },
    { key: "feeAmount", label: "Fee Amount*", searchTerms: ["fee", "amount", "due", "balance"] },
  ],
  grades: [
    { key: "studentName", label: "Student Name*", searchTerms: ["student", "name"] },
    { key: "className", label: "Class*", searchTerms: ["class", "grade", "standard"] },
    { key: "phoneNumber", label: "Parent Phone Number*", searchTerms: ["phone", "mobile", "contact"] },
  ],
};

const PREVIEW_TEMPLATES: Record<Mode, string> = {
    fees: "Hello! This is a gentle reminder that {{studentAndClass}}'s {{feeName}} is pending and is due on {{dueDate}}. Due Amount:{{feeAmount}} .Kindly take care of it at your convenience.",
    grades: "Hello Parent, here is the report for {{studentAndClass}} for the {{examName}} examination:\n\nSubject-wise Grades:\n{{gradesList}}"
};

const FormSchema = z.object({
  feeName: z.string().optional(),
  dueDate: z.date().optional(),
  examName: z.string().optional(),
});

const STEPS = [
  { id: 0, title: "Upload Data", description: "Select your Excel/CSV file", icon: FileCheck2 },
  { id: 1, title: "Map Columns", description: "Match your data to our fields", icon: ListOrdered },
  { id: 2, title: "Preview & Send", description: "Confirm and send notifications", icon: SendHorizontal },
  { id: 3, title: "Status", description: "View sending results", icon: CheckCircle },
];

const findBestMatch = (header: string, fields: typeof MAPPING_FIELDS[Mode]) => {
    const header_norm = header.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const field of fields) {
        for (const term of field.searchTerms) {
            if (header_norm.includes(term)) {
                return field.key;
            }
        }
    }
    return undefined;
};

type SendStatus = {
    studentName: string;
    status: 'success' | 'failed';
    message: string;
}

function EduAlertDashboard() {
  const { toast } = useToast();
  
  const [step, setStep] = React.useState(0);
  const [mode, setMode] = React.useState<Mode>('fees');
  const [file, setFile] = React.useState<File | null>(null);
  const [data, setData] = React.useState<Record<string, any>[]>([]);
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [mappings, setMappings] = React.useState<Record<string, string>>({});
  const [isSending, setIsSending] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [isParsing, setIsParsing] = React.useState(false);
  const [settings, setSettings] = React.useState<SettingsFormValues | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = React.useState(true);
  const [direction, setDirection] = React.useState(1);
  const [sendingProgress, setSendingProgress] = React.useState(0);
  const [sendStatus, setSendStatus] = React.useState<SendStatus[]>([]);


  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      feeName: "Monthly Tuition Fee",
      examName: "Final Term Examination",
      dueDate: new Date(),
    }
  });

  const navigateToStep = (nextStep: number) => {
    setDirection(nextStep > step ? 1 : -1);
    setStep(nextStep);
  }

  React.useEffect(() => {
    async function fetchSettings() {
        setIsLoadingSettings(true);
        const { data, error } = await supabase
            .from('settings')
            .select('*')
            .eq('id', 1)
            .single();

        if (data) {
            setSettings(data);
        } else if (error && error.code !== 'PGRST116') {
             toast({
                variant: "destructive",
                title: "Error fetching settings",
                description: "Could not load settings. Please configure them first.",
            });
        }
        setIsLoadingSettings(false);
    }
    fetchSettings();
  }, [toast]);
  
  React.useEffect(() => {
    const newMappings: Record<string, string> = {};
    
    // Auto-map based on headers
    headers.forEach(header => {
        const bestMatch = findBestMatch(header, MAPPING_FIELDS[mode]);
        // Avoid overwriting existing mappings and ensure one-to-one mapping
        if (bestMatch && !newMappings[bestMatch] && !Object.values(newMappings).includes(header)) {
             newMappings[bestMatch] = header;
        }
    });

    setMappings(newMappings);
  }, [mode, headers]);

  const feeName = form.watch("feeName");
  const dueDate = form.watch("dueDate");
  const examName = form.watch("examName");

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
          
          const fileHeaders = Object.keys(jsonData[0]);
          setData(jsonData);
          setHeaders(fileHeaders);
          
          navigateToStep(1);

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
  
  const allRequiredMapped = React.useMemo(() => {
    const requiredKeys = MAPPING_FIELDS[mode].map(f => f.key);
    return requiredKeys.every(key => mappings[key] && headers.includes(mappings[key]));
  }, [mappings, mode, headers]);


  const handleConfirmMapping = () => {
    if (!allRequiredMapped) {
        toast({
            variant: "destructive",
            title: "Mapping Incomplete",
            description: "Please map all required fields (marked with *) for the selected mode.",
        });
        return;
    }

    const templateName = mode === 'fees' ? settings?.fees_template_name : settings?.marks_template_name;
    if(!templateName) {
         toast({
            variant: "destructive",
            title: "Template Not Found",
            description: `The template name for ${mode} is not configured in settings.`,
        });
        return;
    }

    navigateToStep(2);
    setCurrentPage(1);
  };

  const finalData = React.useMemo(() => {
    if (step < 2) return [];

    return data.map(row => {
        const newRow: Record<string, string> = {};
        Object.entries(mappings).forEach(([mapKey, header]) => {
            newRow[mapKey] = String(row[header] ?? '');
        });
        return { ...newRow, phoneNumber: newRow.phoneNumber, rawData: row };
    });
  }, [step, data, mappings]);

    const exampleMessage = React.useMemo(() => {
        if(step < 2 || finalData.length === 0) return "";

        const firstRow = finalData[0];
        let message = PREVIEW_TEMPLATES[mode];

        const studentAndClass = `${firstRow.studentName || '[Student]'} (${firstRow.className || '[Class]'})`;
        message = message.replace(/{{studentAndClass}}/g, studentAndClass);

        if (mode === 'fees') {
            message = message.replace(/{{feeName}}/g, feeName || '[Fee Name]');
            message = message.replace(/{{feeAmount}}/g, firstRow.feeAmount || '[N/A]');
            message = message.replace(/{{dueDate}}/g, dueDate ? format(dueDate, 'PPP') : '[Due Date]');
        } else {
             const mappedHeaders = Object.values(mappings);
             const gradesList = Object.entries(firstRow.rawData)
                .filter(([header]) => !mappedHeaders.includes(header))
                .map(([subject, grade]) => `${subject}:${grade}`)
                .join('\n');
            message = message.replace(/{{gradesList}}/g, gradesList || 'No grades available.');
            message = message.replace(/{{examName}}/g, examName || '[Exam Name]');
        }
        return message;

    }, [step, finalData, mode, feeName, dueDate, examName, mappings]);


  const handleSend = async () => {
    setIsSending(true);
    setSendStatus([]);
    setSendingProgress(0);
    navigateToStep(3);

    const templateName = mode === 'fees' ? settings?.fees_template_name : settings?.marks_template_name;
    if(!templateName) {
        toast({ variant: "destructive", title: "Error", description: "Template name not found in settings." });
        setIsSending(false);
        return;
    }

    for (let i = 0; i < finalData.length; i++) {
        const row = finalData[i];
        let parameters: string[] = [];

        try {
             if (mode === 'fees') {
                parameters = [
                    `${row.studentName} (${row.className})`,
                    feeName || '',
                    dueDate ? format(dueDate, 'PPP') : '',
                    row.feeAmount,
                ];
            } else {
                const mappedHeaders = Object.values(mappings);
                const gradesList = Object.entries(row.rawData)
                    .filter(([header]) => !mappedHeaders.includes(header))
                    .map(([subject, grade]) => `${subject}: ${grade}`)
                    .join('\n');
                parameters = [
                     `${row.studentName} (${row.className})`,
                     examName || '',
                     gradesList,
                ];
            }

            const input: SendWhatsAppMessageInput = {
                recipientPhoneNumber: row.phoneNumber,
                templateName,
                parameters
            };

            const result = await sendWhatsAppMessage(input);
            if (result.success) {
                setSendStatus(prev => [...prev, { studentName: row.studentName, status: 'success', message: 'Sent successfully' }]);
            } else {
                setSendStatus(prev => [...prev, { studentName: row.studentName, status: 'failed', message: result.error || 'Unknown error' }]);
            }
        } catch (error: any) {
             setSendStatus(prev => [...prev, { studentName: row.studentName, status: 'failed', message: error.message || 'A client-side error occurred.' }]);
        }
        
        setSendingProgress(((i + 1) / finalData.length) * 100);
    }
    
    setIsSending(false);
    toast({
        title: "Process Complete",
        description: `Finished sending notifications. See status below.`,
        className: "bg-primary text-primary-foreground"
    });
  };

  const reset = () => {
    navigateToStep(0);
    setFile(null);
    setData([]);
    setHeaders([]);
    setMappings({});
    form.reset();
    setSendStatus([]);
    setSendingProgress(0);
  };

  const paginatedData = finalData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  const totalPages = Math.ceil(finalData.length / ITEMS_PER_PAGE);
  const currentTemplateName = mode === 'fees' ? settings?.fees_template_name : settings?.marks_template_name;

  const variants = {
    hidden: (direction: number) => ({
      opacity: 0,
      x: direction > 0 ? 30 : -30,
    }),
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
      },
    },
    exit: (direction: number) => ({
      opacity: 0,
      x: direction < 0 ? 30 : -30,
       transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
      },
    }),
  };


  return (
    <Card className="w-full max-w-5xl shadow-2xl overflow-hidden">
        <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-semibold text-primary mb-1">Gnanamani Educational Institutions</h2>
                    <CardTitle className="font-sans text-3xl font-bold">Send Notifications</CardTitle>
                    <CardDescription>
                    Send Fee and Grade Notifications via WhatsApp Seamlessly.
                    </CardDescription>
                </div>
                 <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/settings"><MessageSquareText className="mr-2 h-4 w-4" /> Go to Settings</Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={reset}><RefreshCcw className="mr-2 h-4 w-4" /> Start Over</Button>
                </div>
            </div>
        </CardHeader>
        
        <CardContent>
             <div className="mb-8 p-4">
                 <ol className="relative flex w-full items-center justify-between">
                    {STEPS.map((s, index) => (
                        <li key={s.id} className={cn("flex items-center", { "w-full": index < STEPS.length - 1 })}>
                           <div className="flex flex-col items-center justify-start relative">
                             <button
                               onClick={() => s.id < step && !isSending && navigateToStep(s.id)}
                               disabled={s.id >= step || isSending}
                               className="flex flex-col items-center justify-center w-16 h-16 rounded-full shrink-0 disabled:cursor-not-allowed group z-10"
                             >
                              <span className={cn(
                                  "flex items-center justify-center w-12 h-12 rounded-full shrink-0 transition-colors duration-300",
                                  step > s.id ? "bg-primary text-primary-foreground group-hover:bg-primary/80" : (step === s.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:bg-muted/80")
                              )}>
                                  {step > s.id ? <Check className="w-6 h-6"/> : <s.icon className="w-6 h-6"/>}
                              </span>
                             </button>
                             <div className="mt-2 text-center absolute top-16 w-32">
                                  <h3 className={cn("font-medium text-sm", step >= s.id && "text-foreground")}>{s.title}</h3>
                              </div>
                           </div>
                           {index < STEPS.length - 1 && <div className="h-1 w-full bg-border flex-1 -ml-4 -mr-4" />}
                        </li>
                    ))}
                </ol>
            </div>
            
            <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                    key={step}
                    custom={direction}
                    variants={variants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                >

            {step === 0 && (
                <div className="text-center p-8 border-2 border-dashed rounded-lg transition-colors hover:border-primary">
                    {isParsing ? (
                        <>
                            <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin" />
                            <h3 className="mt-4 text-lg font-semibold">Parsing Your File</h3>
                            <p className="mt-1 text-sm text-muted-foreground">Please wait while we read your data.</p>
                        </>
                    ) : (
                        <>
                            <FileUp className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-semibold">Upload Student Data</h3>
                            <p className="mt-1 text-sm text-muted-foreground">Click below to select an Excel or CSV file.</p>
                            <p className="mt-1 text-xs text-muted-foreground">Supported formats: .xlsx, .xls, .csv</p>
                            <div className="mt-6">
                                <Button asChild>
                                    <label htmlFor="file-upload" className="cursor-pointer">
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
                        <h3 className="text-xl font-semibold">Map Data Columns</h3>
                        <p className="text-muted-foreground">Match your sheet's columns to the required fields. We've tried to guess for you!</p>
                        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="w-fit mt-4">
                            <TabsList>
                                <TabsTrigger value="fees"><DollarSign className="mr-2 h-4 w-4" />Fee Notifications</TabsTrigger>
                                <TabsTrigger value="grades"><GraduationCap className="mr-2 h-4 w-4" />Grade Reports</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                    {isLoadingSettings ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin"/>
                            <span>Loading settings...</span>
                        </div>
                    ): !currentTemplateName ? (
                        <Alert variant="destructive">
                           <CircleAlert className="h-4 w-4" />
                           <AlertTitle>Setting Missing</AlertTitle>
                           <AlertDescription>
                             The template name for '{mode}' notifications is not set. Please <Link href="/settings" className="font-bold underline">go to settings</Link> to configure it.
                           </AlertDescription>
                        </Alert>
                    ) : (
                         <Alert>
                            <MessageSquareText className="h-4 w-4"/>
                           <AlertTitle>Template To Be Used</AlertTitle>
                           <AlertDescription>
                            The WhatsApp template <span className="font-semibold">{currentTemplateName}</span> from your settings will be used for sending messages.
                           </AlertDescription>
                        </Alert>
                    )}

                    {!allRequiredMapped && (
                         <Alert variant="destructive">
                            <CircleAlert className="h-4 w-4" />
                            <AlertTitle>Action Required</AlertTitle>
                            <AlertDescription>Please map all required fields marked with an asterisk (*).</AlertDescription>
                        </Alert>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {MAPPING_FIELDS[mode].map(field => (
                            <div key={field.key} className="space-y-2">
                                <Label htmlFor={`map-${field.key}`}>{field.label}</Label>
                                <Select onValueChange={value => setMappings(prev => ({ ...prev, [field.key]: value }))} value={mappings[field.key]}>
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
                     <Alert variant="default" className="bg-sky-50 border-sky-200 dark:bg-sky-950 dark:border-sky-800">
                        <GraduationCap className="h-4 w-4 !text-sky-600" />
                        <AlertTitle>Note on Grade Reports</AlertTitle>
                        <AlertDescription>
                            For grade reports, any columns not mapped above will be automatically included in the message as a subject and its corresponding grade.
                        </AlertDescription>
                    </Alert>
                     <div className="flex justify-between items-center pt-4">
                        <Button variant="outline" onClick={() => navigateToStep(0)}><ArrowLeft className="mr-2 h-4 w-4"/> Back</Button>
                        <Button onClick={handleConfirmMapping} disabled={!currentTemplateName || isLoadingSettings || !allRequiredMapped}>
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
                                <h3 className="text-xl font-semibold">Final Configuration</h3>
                                <p className="text-sm text-muted-foreground">Fill in the remaining details for your notification template.</p>
                                {mode === "fees" && (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="feeName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Fee Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g., Annual Tuition Fee" {...field} value={field.value ?? ""} />
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
                                                    <Input placeholder="e.g., Mid-Term Exams" {...field} value={field.value ?? ""} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                )}
                                 <div className="mt-6">
                                    <h3 className="text-xl font-semibold mb-2">Live Message Preview</h3>
                                    <Card className="bg-muted/50">
                                        <CardContent className="p-4">
                                            <div className="flex items-start gap-3">
                                                <MessageSquareText className="w-5 h-5 mt-1 text-muted-foreground flex-shrink-0" />
                                                <p className="text-sm text-foreground whitespace-pre-wrap">{exampleMessage}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                            <div className="lg:col-span-2">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-xl font-semibold">Data Preview</h3>
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
                                                    <TableHead>Class</TableHead>
                                                    <TableHead>Phone</TableHead>
                                                    {mode === 'fees' && <TableHead>Fee Amount</TableHead>}
                                                    {mode === 'grades' && Object.keys(data[0] ?? {})
                                                        .filter(header => !Object.values(mappings).includes(header))
                                                        .map(subject => <TableHead key={subject}>{subject}</TableHead>)
                                                    }
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                            {paginatedData.length > 0 ? paginatedData.map((row, index) => (
                                                <TableRow key={index}>
                                                    <TableCell className="font-medium">{row.studentName}</TableCell>
                                                    <TableCell>{row.className}</TableCell>
                                                    <TableCell>{row.phoneNumber}</TableCell>
                                                     {mode === 'fees' && <TableCell>{row.feeAmount}</TableCell>}
                                                     {mode === 'grades' && Object.keys(data[0] ?? {})
                                                        .filter(header => !Object.values(mappings).includes(header))
                                                        .map(subject => <TableCell key={subject}>{data.find(d => d[mappings['studentName']] === row.studentName)?.[subject]}</TableCell>)
                                                    }
                                                </TableRow>
                                            )) : (
                                                <TableRow><TableCell colSpan={mode === 'fees' ? 4 : 3 + (Object.keys(data[0] ?? {}).length - Object.values(mappings).length)} className="text-center h-24">No data to display.</TableCell></TableRow>
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

                        <div className="flex justify-between items-center">
                            <Button variant="outline" onClick={() => navigateToStep(1)}><ArrowLeft className="mr-2 h-4 w-4"/> Back to Mapping</Button>
                             <Button type="button" size="lg" onClick={handleSend} disabled={isSending || finalData.length === 0}>
                                {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
                                {isSending ? "Sending..." : `Send ${finalData.length} Notifications`}
                             </Button>
                        </div>
                    </form>
                </Form>
            )}

             {step === 3 && (
                <div className="space-y-6">
                    <div>
                        <h3 className="text-xl font-semibold">Sending Notifications</h3>
                        <p className="text-muted-foreground">
                            {isSending ? `Processing message ${sendStatus.length} of ${finalData.length}...` : `Finished sending all ${finalData.length} notifications.`}
                        </p>
                    </div>
                     <Progress value={sendingProgress} className="w-full" />
                     <div className="max-h-96 overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Student Name</TableHead>
                                    <TableHead>Details</TableHead>
                                </TableRow>
                            </TableHeader>
                             <TableBody>
                                {sendStatus.map((result, index) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                            {result.status === 'success' ? 
                                                <CheckCircle className="h-5 w-5 text-green-500" /> : 
                                                <XCircle className="h-5 w-5 text-red-500" />
                                            }
                                        </TableCell>
                                        <TableCell className="font-medium">{result.studentName}</TableCell>
                                        <TableCell className="text-xs">{result.message}</TableCell>
                                    </TableRow>
                                ))}
                             </TableBody>
                        </Table>
                     </div>
                      <div className="flex justify-end pt-4">
                        <Button onClick={reset}><RefreshCcw className="mr-2 h-4 w-4" /> Send Another Batch</Button>
                    </div>
                </div>
            )}
            </motion.div>
          </AnimatePresence>
        </CardContent>
    </Card>
  );
}

export default function HomePage() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center bg-background justify-center p-4 sm:p-8">
      <EduAlertDashboard />
    </main>
  );
}
