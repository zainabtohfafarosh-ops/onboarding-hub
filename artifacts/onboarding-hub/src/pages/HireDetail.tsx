import { useState, useRef, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  useGetHire, 
  useUpdateHire, 
  useListHireTasks, 
  useCreateHireTask,
  useUpdateTask,
  useDeleteTask,
  useListScheduledComms,
  getGetHireQueryKey,
  getListHireTasksQueryKey,
  getListScheduledCommsQueryKey,
  HireOrientationType,
  HireStatus
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { format, parseISO } from "date-fns";
import { ArrowLeft, Mail, Calendar, User, Briefcase, MapPin, Monitor, Laptop, Plus, Trash2, CheckCircle2, AlertCircle, Clock, Users, Sparkles, Loader2, ExternalLink, Ticket, Crown } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

const hireSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  email: z.string().email("Invalid email"),
  title: z.string().min(1, "Required"),
  department: z.string().optional(),
  location: z.string().min(1, "Required"),
  orientationType: z.enum(["in-person", "virtual"]),
  orientationDate: z.string().min(1, "Required"),
  hiringManager: z.string().min(1, "Required"),
  recruiter: z.string().min(1, "Required"),
  functionalManager: z.string().optional(),
  managerInPerson: z.boolean().optional(),
  inPersonBuddy: z.string().optional(),
  laptopType: z.enum(["mac", "pc"]).optional(),
  laptopTrackingNumber: z.string().optional(),
  shippingAddress: z.string().optional(),
  addressSharedWithIT: z.boolean().default(false),
  status: z.enum(["confirmed", "pending", "cancelled"]),
  notes: z.string().optional(),
  jiraTicketUrl: z.string().optional(),
  isVip: z.boolean().default(false),
  vipScenario: z.string().optional(),
});

export default function HireDetail() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "new";
  const hireId = isNew ? 0 : parseInt(id, 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: hire, isLoading: isLoadingHire } = useGetHire(hireId, {
    query: { enabled: !isNew && !isNaN(hireId), queryKey: getGetHireQueryKey(hireId) }
  });

  const { data: tasks, isLoading: isLoadingTasks, refetch: refetchTasks } = useListHireTasks(hireId, {
    query: {
      enabled: !isNew && !isNaN(hireId),
      queryKey: getListHireTasksQueryKey(hireId),
      refetchOnWindowFocus: true,
    }
  });

  const { data: comms, isLoading: isLoadingComms, refetch: refetchComms } = useListScheduledComms({ hireId }, {
    query: {
      enabled: !isNew && !isNaN(hireId),
      queryKey: getListScheduledCommsQueryKey({ hireId }),
      refetchOnWindowFocus: true,
    }
  });

  const updateHire = useUpdateHire();
  const createTask = useCreateHireTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const form = useForm<z.infer<typeof hireSchema>>({
    resolver: zodResolver(hireSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      title: "",
      department: "",
      location: "",
      orientationType: "virtual",
      orientationDate: format(new Date(), "yyyy-MM-dd"),
      hiringManager: "",
      recruiter: "",
      functionalManager: "",
      managerInPerson: undefined,
      inPersonBuddy: "",
      laptopType: undefined,
      laptopTrackingNumber: "",
      shippingAddress: "",
      addressSharedWithIT: false,
      status: "pending",
      notes: "",
      jiraTicketUrl: "",
      isVip: false,
      vipScenario: "",
    },
  });

  const watchedOrientationType = form.watch("orientationType");
  const watchedManagerInPerson = form.watch("managerInPerson");
  const watchedLocation = form.watch("location");
  const watchedIsVip = form.watch("isVip");

  const initRef = useRef<number | null>(null);
  useEffect(() => {
    if (hire && initRef.current !== hire.id) {
      initRef.current = hire.id;
      form.reset({
        firstName: hire.firstName,
        lastName: hire.lastName,
        email: hire.email,
        title: hire.title,
        department: hire.department || "",
        location: hire.location,
        orientationType: hire.orientationType,
        orientationDate: hire.orientationDate,
        hiringManager: hire.hiringManager,
        recruiter: hire.recruiter,
        functionalManager: hire.functionalManager || "",
        managerInPerson: hire.managerInPerson ?? undefined,
        inPersonBuddy: hire.inPersonBuddy || "",
        laptopType: (hire.laptopType as "mac" | "pc") ?? undefined,
        laptopTrackingNumber: hire.laptopTrackingNumber || "",
        shippingAddress: hire.shippingAddress || "",
        addressSharedWithIT: hire.addressSharedWithIT,
        status: hire.status as any || "pending",
        notes: hire.notes || "",
        jiraTicketUrl: hire.jiraTicketUrl || "",
        isVip: hire.isVip ?? false,
        vipScenario: hire.vipScenario || "",
      });
    }
  }, [hire, form]);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isSeeding, setIsSeeding] = useState(false);
  const [isApplyingVipPlan, setIsApplyingVipPlan] = useState(false);

  const handleSeedTasks = async () => {
    if (isNew) return;
    setIsSeeding(true);
    try {
      const res = await fetch(`/api/hires/${hireId}/tasks/seed`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to seed tasks" }));
        toast({ title: err.error || "Failed to seed tasks", variant: "destructive" });
        return;
      }
      const data = await res.json();
      if (data.created === 0 && data.removed === 0) {
        toast({ title: "Checklist is up to date", description: "All profile-specific tasks are already aligned." });
      } else {
        const changes = [
          data.created ? `${data.created} added` : null,
          data.removed ? `${data.removed} removed` : null,
        ].filter(Boolean).join(" · ");
        toast({ title: "Checklist synchronized", description: changes });
      }
      refetchTasks();
    } catch {
      toast({ title: "Failed to seed tasks", variant: "destructive" });
    } finally {
      setIsSeeding(false);
    }
  };

  const onSubmit = (values: z.infer<typeof hireSchema>) => {
    if (!isNew) {
      updateHire.mutate({ id: hireId, data: values }, {
        onSuccess: () => {
          toast({ title: "Hire updated successfully" });
          refetchTasks();
        },
        onError: () => {
          toast({ title: "Failed to update hire", variant: "destructive" });
        }
      });
    } else {
      toast({ title: "Not implemented: Create Hire" });
    }
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || isNew) return;

    createTask.mutate({ 
      hireId, 
      data: { title: newTaskTitle, completed: false } 
    }, {
      onSuccess: () => {
        setNewTaskTitle("");
        refetchTasks();
      }
    });
  };

  const handleToggleTask = (taskId: number, completed: boolean) => {
    updateTask.mutate({ id: taskId, data: { completed } }, {
      onSuccess: () => refetchTasks()
    });
  };

  const handleDeleteTask = (taskId: number) => {
    deleteTask.mutate({ id: taskId }, {
      onSuccess: () => refetchTasks()
    });
  };

  const handleApplyVipPlan = async () => {
    if (isNew) return;
    setIsApplyingVipPlan(true);
    try {
      const res = await fetch(`/api/hires/${hireId}/vip-comms/seed`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to apply VIP communication plan");
      }
      toast({
        title: "VIP communication plan applied",
        description: data.created
          ? `${data.created} curated message${data.created === 1 ? "" : "s"} scheduled.`
          : "All VIP messages are already scheduled.",
      });
      refetchComms();
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Failed to apply VIP communication plan",
        variant: "destructive",
      });
    } finally {
      setIsApplyingVipPlan(false);
    }
  };

  if (isLoadingHire) {
    return (
      <div className="flex-1 p-8">
        <Skeleton className="h-8 w-64 mb-8" />
        <div className="grid md:grid-cols-3 gap-6">
          <Skeleton className="md:col-span-2 h-[600px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  const isInPerson = watchedOrientationType === "in-person";
  const managerNotOnsite = isInPerson && watchedManagerInPerson === false;
  const showLaptopType = watchedLocation.trim().toLowerCase() !== "mumbai";
  const commsById = new Map((comms ?? []).map((comm) => [comm.id, comm]));

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/hires">
            <ArrowLeft className="mr-2 size-4" />
            Back to Directory
          </Link>
        </Button>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">
            {isNew ? "New Hire" : hire ? `${hire.firstName} ${hire.lastName}` : "Hire Not Found"}
          </h1>
          {!isNew && hire && (
            <Badge 
              variant={hire.status === 'confirmed' ? 'default' : hire.status === 'cancelled' ? 'destructive' : 'secondary'}
              className="text-sm px-3 py-1"
            >
              {hire.status?.toUpperCase() || 'PENDING'}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Name */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Email + Title */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl><Input type="email" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job Title</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Department + Location */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Orientation */}
                  <div className="grid md:grid-cols-2 gap-4 border-t pt-6 mt-6">
                    <FormField
                      control={form.control}
                      name="orientationDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Orientation Date</FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="orientationType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Orientation Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="in-person">In-Person</SelectItem>
                              <SelectItem value="virtual">Virtual</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* People — Recruiter, Hiring Manager, Functional Manager */}
                  <div className="border-t pt-6 mt-6 space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">People</h3>

                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="recruiter"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Recruiter</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="hiringManager"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hiring Manager</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="functionalManager"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Functional Manager
                            <span className="ml-2 text-xs font-normal text-muted-foreground">(if applicable)</span>
                          </FormLabel>
                          <FormControl><Input placeholder="Leave blank if not applicable" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* In-person manager logistics — only shown for in-person hires */}
                    {isInPerson && (
                      <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                          <Users className="size-4 text-muted-foreground" />
                          Manager Attendance
                        </h4>

                        <FormField
                          control={form.control}
                          name="managerInPerson"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Is the manager attending in-person orientation?</FormLabel>
                              <Select
                                onValueChange={(val) => field.onChange(val === "yes" ? true : val === "no" ? false : undefined)}
                                value={field.value === true ? "yes" : field.value === false ? "no" : ""}
                              >
                                <FormControl>
                                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="yes">Yes — manager will be there</SelectItem>
                                  <SelectItem value="no">No — manager will not be there</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {managerNotOnsite && (
                          <FormField
                            control={form.control}
                            name="inPersonBuddy"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  In-Person Buddy
                                  <span className="ml-2 text-xs font-normal text-muted-foreground">Who will greet this hire on orientation day?</span>
                                </FormLabel>
                                <FormControl><Input placeholder="Name of designated buddy" {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    )}

                    <div className={`rounded-lg border p-4 space-y-4 ${watchedIsVip ? "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20" : "bg-muted/20"}`}>
                      <FormField
                        control={form.control}
                        name="isVip"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between space-y-0">
                            <div className="space-y-0.5">
                              <FormLabel className="flex items-center gap-1.5 text-base">
                                <Crown className="size-4 text-amber-600" />
                                VIP onboarding
                              </FormLabel>
                              <CardDescription>
                                Use a curated, reviewable communication sequence for this hire.
                              </CardDescription>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {watchedIsVip && (
                        <FormField
                          control={form.control}
                          name="vipScenario"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>VIP scenario</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Executive onboarding" {...field} />
                              </FormControl>
                              <p className="text-xs text-muted-foreground">
                                This label helps the team tailor and review the VIP sequence.
                              </p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  </div>

                  {/* IT & Equipment */}
                  <div className="border-t pt-6 mt-6 space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">IT &amp; Equipment</h3>
                    
                    <FormField
                      control={form.control}
                      name="shippingAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Shipping Address</FormLabel>
                          <FormControl>
                            <Textarea className="resize-none h-20" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {showLaptopType && (
                      <FormField
                        control={form.control}
                        name="laptopType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Laptop Type</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value ?? ""}
                            >
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Select Mac or PC" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="mac">Mac</SelectItem>
                                <SelectItem value="pc">PC</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="laptopTrackingNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Laptop Tracking #</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="addressSharedWithIT"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Shared with IT</FormLabel>
                              <CardDescription>Address sent to IT team</CardDescription>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Jira */}
                  <div className="border-t pt-6 mt-6 space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Integrations</h3>
                    <FormField
                      control={form.control}
                      name="jiraTicketUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1.5">
                            <Ticket className="size-3.5" />
                            Jira Ticket URL
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://yourcompany.atlassian.net/browse/IT-1234"
                              {...field}
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            Paste the full Jira ticket URL. Click the link in the sidebar card to open it in a new tab.
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Status */}
                  <div className="border-t pt-6 mt-6">
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end pt-4 border-t">
                    <Button 
                      type="submit" 
                      disabled={updateHire.isPending || (isNew && true)}
                    >
                      {updateHire.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {!isNew && (
          <div className="space-y-6">
            {hire?.isVip && (
              <Card className="border-amber-200 bg-amber-50/40 dark:border-amber-900 dark:bg-amber-950/15">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Crown className="size-4 text-amber-600" />
                    VIP Communications
                  </CardTitle>
                  <CardDescription>
                    {hire.vipScenario || "VIP onboarding"} · curated sequence with individual message review
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Apply the VIP template chain, then refine any individual messages in Communications.
                  </p>
                  <Button
                    type="button"
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                    onClick={handleApplyVipPlan}
                    disabled={isApplyingVipPlan}
                  >
                    {isApplyingVipPlan ? (
                      <><Loader2 className="mr-2 size-4 animate-spin" /> Applying plan…</>
                    ) : (
                      <><Sparkles className="mr-2 size-4" /> Apply VIP Communication Plan</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Jira Tickets */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Ticket className="size-4 text-primary" />
                  Jira Tickets
                </CardTitle>
              </CardHeader>
              <CardContent>
                {hire?.jiraTicketUrl ? (
                  <a
                    href={hire.jiraTicketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2.5 rounded-md border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors text-sm font-medium"
                  >
                    <ExternalLink className="size-3.5 shrink-0" />
                    <span className="truncate">{hire.jiraTicketUrl.replace(/^https?:\/\//, "")}</span>
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-3">
                    No Jira ticket linked yet. Add a URL in the profile form below.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex justify-between items-center">
                  <span>Task Checklist</span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1.5 text-violet-600 border-violet-200 hover:bg-violet-50 hover:border-violet-300 dark:text-violet-400 dark:border-violet-800 dark:hover:bg-violet-950/40"
                      onClick={handleSeedTasks}
                      disabled={isSeeding}
                    >
                      {isSeeding ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Sparkles className="size-3" />
                      )}
                      {isSeeding ? "Syncing…" : "Sync Checklist"}
                    </Button>
                    <Badge variant="outline">
                      {tasks?.filter(t => t.completed).length || 0} / {tasks?.length || 0}
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddTask} className="flex gap-2 mb-4">
                  <Input 
                    placeholder="Add a new task..." 
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Button type="submit" size="sm" disabled={!newTaskTitle.trim() || createTask.isPending}>
                    <Plus className="size-4" />
                  </Button>
                </form>
                
                {isLoadingTasks ? (
                  <div className="space-y-3">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : !tasks || tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No tasks assigned yet.</p>
                ) : (
                  <div className="space-y-1">
                    {tasks.map(task => {
                      const linkedComm = task.scheduledCommId ? commsById.get(task.scheduledCommId) : undefined;
                      return (
                      <div key={task.id} className="group flex items-start gap-3 p-2 hover:bg-muted/50 rounded-md transition-colors">
                        <Checkbox 
                          id={`task-${task.id}`} 
                          checked={task.completed}
                          onCheckedChange={(checked) => handleToggleTask(task.id, checked as boolean)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <label 
                            htmlFor={`task-${task.id}`}
                            className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer ${task.completed ? 'line-through text-muted-foreground' : ''}`}
                          >
                            {task.title}
                          </label>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                          {task.scheduledCommId && (
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              <Badge variant="outline" className="h-5 gap-1 px-1.5 text-[10px]">
                                <Mail className="size-3" />
                                Email · {linkedComm?.recipientType === "hiring-manager" ? "Manager" : "Hire"}
                              </Badge>
                              {linkedComm && (
                                <Badge
                                  variant={linkedComm.status === "sent" ? "default" : linkedComm.status === "cancelled" ? "destructive" : "secondary"}
                                  className="h-5 px-1.5 text-[10px]"
                                >
                                  {linkedComm.status}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        {!task.scheduledCommId && <Button 
                          variant="ghost" 
                          size="icon" 
                          className="size-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          <Trash2 className="size-3" />
                        </Button>}
                      </div>
                    )})}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>Communications</span>
                  <Button variant="ghost" size="icon" className="size-6" asChild>
                    <Link href={`/scheduled-comms?hireId=${hireId}`}>
                      <Plus className="size-4" />
                    </Link>
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingComms ? (
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : !comms || comms.length === 0 ? (
                  <div className="text-center py-6">
                    <Mail className="size-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No comms scheduled.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {comms.map(comm => (
                      <div key={comm.id} className="p-3 border rounded-md bg-card">
                        <div className="flex items-start justify-between mb-1">
                          <div className="font-medium text-sm truncate pr-2" title={comm.subject}>
                            {comm.subject}
                          </div>
                          <Badge variant={
                            comm.status === 'sent' ? 'default' : 
                            comm.status === 'cancelled' ? 'destructive' : 
                            'secondary'
                          } className="text-[10px] h-4 px-1.5 py-0 shrink-0">
                            {comm.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                            <Clock className="size-3" />
                            {format(parseISO(comm.scheduledAt), "MMM d")} 
                          </div>
                          <div className="bg-muted px-1.5 py-0.5 rounded text-[10px]">
                            To: {comm.recipientType === 'hire' ? 'Hire' : 'Manager'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
