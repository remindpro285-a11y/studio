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
  DollarSign
} from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

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

type Mode = "fees" | "grades";

// Mock Data
const MOCK_DATA = [
    { "Student Name": "Liam Johnson", "Class Attended": "Class 10-A", "Parent Phone": "1112223331", "Pending Dues": "5,000", "Latest Grade": "A+" },
    { "Student Name": "Olivia Smith", "Class Attended": "Class 10-B", "Parent Phone": "1112223332", "Pending Dues": "5,000", "Latest Grade": "A" },
    { "Student Name": "Noah Williams", "Class Attended": "Class 9-C", "Parent Phone": "1112223333", "Pending Dues": "4,500", "Latest Grade": "B+" },
    { "Student Name": "Emma Brown", "Class Attended": "Class 11-A", "Parent Phone": "1112223334", "Pending Dues": "6,000", "Latest Grade": "C" },
    { "Student Name": "Oliver Jones", "Class Attended": "Class 12-B", "Parent Phone": "1112223335", "Pending Dues": "6,500", "Latest Grade": "A-" },
    { "Student Name": "Ava Garcia", "Class Attended": "Class 8-A", "Parent Phone": "1112223336", "Pending Dues": "4,000", "Latest Grade": "B" },
    { "Student Name": "Elijah Miller", "Class Attended": "Class 7-D", "Parent Phone": "1112223337", "Pending Dues": "3,500", "Latest Grade": "B-" },
    { "Student Name": "Charlotte Davis", "Class Attended": "Class 10-A", "Parent Phone": "1112223338", "Pending Dues": "5,000", "Latest Grade": "A+" },
    { "Student Name": "James Rodriguez", "Class Attended": "Class 9-B", "Parent Phone": "1112223339", "Pending Dues": "4,500", "Latest Grade": "C+" },
    { "Student Name": "Sophia Wilson", "Class Attended": "Class 11-C", "Parent Phone": "1112223340", "Pending Dues": "6,000", "Latest Grade": "B+" },
    { "Student Name": "Benjamin Martinez", "Class Attended": "Class 12-A", "Parent Phone": "1112223341", "Pending Dues": "6,500", "Latest Grade": "A" },
    { "Student Name": "Isabella Anderson", "Class Attended": "Class 8-B", "Parent Phone": "1112223342", "Pending Dues": "4,000", "Latest Grade": "A-" }
];

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
    { key: "grade", label: "Grade/Score" },
  ],
};

const TEMPLATES: Record<Mode, { id: string; name: string; text: string }[]> = {
  fees: [
    { id: "fee_reminder_1", name: "Formal Fee Reminder", text: "Dear Parent, the {{feeName}} of ₹{{feeAmount}} for your child {{studentName}} is due on {{dueDate}}. Kindly pay at your earliest convenience. Thank you, School Admin." },
    { id: "fee_reminder_2", name: "Urgent Fee Notice", text: "URGENT: The {{feeName}} of ₹{{feeAmount}} for {{studentName}} is due on {{dueDate}}. Please clear the dues to avoid late fees. Regards, Accounts Department." },
  ],
  grades: [
    { id: "grade_update_1", name: "Standard Grade Update", text: "Dear Parent, your child {{studentName}} of class {{className}} has secured grade '{{grade}}' in the {{examName}}. Congratulations! - Principal" },
    { id: "grade_update_2", name: "Detailed Performance Report", text: "Performance Update: {{studentName}} (Class {{className}}) has received a grade of '{{grade}}' in the recent {{examName}}. For a detailed report, please visit the parent portal. Best, Examination Office." },
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
  const [data, setData] = React.useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [mappings, setMappings] = React.useState<Record<string, string>>({});
  const [finalData, setFinalData] = React.useState<Record<string, string>[]>([]);
  const [isSending, setIsSending] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const ITEMS_PER_PAGE = 5;

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });
  const formWatcher = form.watch();
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      // Simulate parsing
      setData(MOCK_DATA);
      setHeaders(Object.keys(MOCK_DATA[0]));
      setStep(1);
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
            newRow[mapKey] = row[header];
        });

        message = message.replace(/{{studentName}}/g, newRow.studentName || '[N/A]');
        message = message.replace(/{{className}}/g, newRow.className || '[N/A]');
        
        if (mode === 'fees') {
            message = message.replace(/{{feeName}}/g, formWatcher.feeName || '[Fee Name]');
            message = message.replace(/{{feeAmount}}/g, newRow.feeAmount || '[N/A]');
            message = message.replace(/{{dueDate}}/g, formWatcher.dueDate ? format(formWatcher.dueDate, 'PPP') : '[Due Date]');
        } else {
            message = message.replace(/{{grade}}/g, newRow.grade || '[N/A]');
            message = message.replace(/{{examName}}/g, formWatcher.examName || '[Exam Name]');
        }
        
        return { ...newRow, message };
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
                {step > 0 && <Button variant="outline" size="sm" onClick={reset}><RefreshCcw className="mr-2 h-4 w-4" /> Start Over</Button>}
            </div>
        </CardHeader>
      
        <CardContent>
            {step === 0 && (
                <div className="text-center p-8 border-2 border-dashed rounded-lg">
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
                     <p className="mt-4 text-xs text-muted-foreground">No file? We'll use sample data.</p>
                </div>
            )}
            
            {step === 1 && (
                <div className="space-y-6">
                    <div>
                        <h3 className="text-xl font-semibold font-headline">Map Data Columns</h3>
                        <p className="text-muted-foreground">Match your sheet columns to the required fields.</p>
                        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="w-fit mt-4">
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
                                        <SelectValue placeholder="Select column..." />
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
                     <div className="flex justify-between items-center pt-4">
                        <Button variant="outline" onClick={() => setStep(0)}><ArrowLeft className="mr-2 h-4 w-4"/> Back</Button>
                        <Button onClick={handleConfirmMapping} className="bg-accent hover:bg-accent/90">
                            Confirm Mappings <ChevronRight className="ml-2 h-4 w-4"/>
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
                                                    <TableCell className="font-medium w-1/3">
                                                        <div className="font-semibold">{row.studentName}</div>
                                                        <div className="text-sm text-muted-foreground">Class: {row.className}</div>
                                                        <div className="text-sm text-muted-foreground">Phone: {row.phoneNumber}</div>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground leading-relaxed">{row.message}</TableCell>
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
