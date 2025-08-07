
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, FileText, GraduationCap, Home, LogOut, Package2, Settings, Users, ArrowUpRight, DollarSign, Send } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const DashboardStatCard = ({ title, value, icon: Icon, change, changeType, description }: { title: string, value: string, icon: React.ElementType, change?: string, changeType?: 'increase' | 'decrease', description: string }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            {change && <p className="text-xs text-muted-foreground">
                <span className={cn("font-semibold", changeType === 'increase' ? 'text-green-500' : 'text-red-500')}>{change}</span> {description}
            </p>}
        </CardContent>
    </Card>
);

export default function Dashboard() {
    return (
        <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
            <div className="hidden border-r bg-muted/40 md:block">
                <div className="flex h-full max-h-screen flex-col gap-2">
                    <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                        <Link href="/" className="flex items-center gap-2 font-semibold">
                            <Package2 className="h-6 w-6 text-primary" />
                            <span className="">EduAlert</span>
                        </Link>
                    </div>
                    <div className="flex-1">
                        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                            <Link
                                href="#"
                                className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2 text-primary transition-all hover:text-primary"
                            >
                                <Home className="h-4 w-4" />
                                Dashboard
                            </Link>
                             <Link
                                href="/send"
                                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
                            >
                                <Send className="h-4 w-4" />
                                Send Notifications
                            </Link>
                            <Link
                                href="#"
                                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
                            >
                                <FileText className="h-4 w-4" />
                                History
                            </Link>
                            <Link
                                href="#"
                                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
                            >
                                <Users className="h-4 w-4" />
                                Students
                            </Link>
                             <Link
                                href="/settings"
                                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
                            >
                                <Settings className="h-4 w-4" />
                                Settings
                            </Link>
                        </nav>
                    </div>
                    <div className="mt-auto p-4">
                        <Card>
                            <CardHeader className="p-2 pt-0 md:p-4">
                                <CardTitle>Upgrade to Pro</CardTitle>
                                <CardDescription>
                                    Unlock all features and get unlimited access to our support team.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-2 pt-0 md:p-4 md:pt-0">
                                <Button size="sm" className="w-full">
                                    Upgrade
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
            <div className="flex flex-col">
                <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
                    <div className="w-full flex-1">
                        <h1 className="text-lg font-semibold md:text-2xl">Welcome, Admin!</h1>
                    </div>
                    <Button variant="outline" size="icon" className="h-8 w-8">
                        <Bell className="h-4 w-4" />
                        <span className="sr-only">Toggle notifications</span>
                    </Button>
                    <Link href="/settings">
                        <Button variant="secondary" size="icon" className="h-8 w-8">
                            <Settings className="h-4 w-4" />
                            <span className="sr-only">Settings</span>
                        </Button>
                    </Link>
                    <Button variant="destructive" size="icon" className="h-8 w-8">
                        <LogOut className="h-4 w-4" />
                        <span className="sr-only">Logout</span>
                    </Button>
                </header>
                <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
                    <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-2">
                        <Card className="sm:col-span-2">
                            <CardHeader className="pb-3">
                                <CardTitle>Quick Actions</CardTitle>
                                <CardDescription className="max-w-lg text-balance leading-relaxed">
                                    Start a new notification campaign in just a few clicks.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex gap-2">
                                <Button asChild>
                                    <Link href="/send?mode=fees"><DollarSign className="mr-2 h-4 w-4" /> Send Fee Reminder</Link>
                                </Button>
                                <Button asChild variant="secondary">
                                    <Link href="/send?mode=grades"><GraduationCap className="mr-2 h-4 w-4" /> Send Grade Report</Link>
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                     <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
                        <DashboardStatCard title="Total Students" value="1,254" icon={Users} change="+20.1%" changeType="increase" description="from last month" />
                        <DashboardStatCard title="Fee Reminders Sent" value="8,430" icon={DollarSign} change="+15.2%" changeType="increase" description="this month" />
                        <DashboardStatCard title="Grade Reports Sent" value="6,210" icon={GraduationCap} change="+5.7%" changeType="increase" description="this month" />
                        <DashboardStatCard title="Last Campaign" value="98% Delivered" icon={Send} description="for Q2 Fees" />
                    </div>

                    <Card>
                        <CardHeader className="flex flex-row items-center">
                            <div className="grid gap-2">
                                <CardTitle>Recent Campaigns</CardTitle>
                                <CardDescription>
                                    An overview of your most recent notification campaigns.
                                </CardDescription>
                            </div>
                            <Button asChild size="sm" className="ml-auto gap-1">
                                <Link href="#">
                                    View All
                                    <ArrowUpRight className="h-4 w-4" />
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {/* Placeholder for campaign history table */}
                            <div className="text-center text-muted-foreground py-12">
                                <FileText className="mx-auto h-12 w-12" />
                                <h3 className="mt-4 text-lg font-semibold">No Recent Campaigns</h3>
                                <p className="mt-1 text-sm">Your sent campaigns will appear here.</p>
                            </div>
                        </CardContent>
                    </Card>

                </main>
            </div>
        </div>
    );
}
