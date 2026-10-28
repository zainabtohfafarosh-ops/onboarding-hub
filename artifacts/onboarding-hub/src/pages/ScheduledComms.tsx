import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { 
  useListScheduledComms,
  useUpdateScheduledComm,
  useMarkScheduledCommSent,
  ScheduledComm
} from "@workspace/api-client-react";
import { getListHireTasksQueryKey } from "@workspace/api-client-react";
import { format, parseISO, isPast } from "date-fns";
import { 
  Mail, 
  Send, 
  Clock, 
  Edit, 
  User, 
  CheckCircle2, 
  AlertCircle,
  MoreHorizontal
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ScheduledComms() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const hireIdParam = searchParams.get("hireId");
  
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const queryParams: any = {};
  if (hireIdParam) queryParams.hireId = parseInt(hireIdParam, 10);
  if (statusFilter !== "all") queryParams.status = statusFilter;

  const { data: comms, isLoading, refetch } = useListScheduledComms(queryParams);
  const updateComm = useUpdateScheduledComm();
  const markSent = useMarkScheduledCommSent();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editingComm, setEditingComm] = useState<ScheduledComm | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");

  const handleOpenEdit = (comm: ScheduledComm) => {
    setEditingComm(comm);
    setEditSubject(comm.subject);
    setEditBody(comm.body);
  };

  const handleSaveEdit = () => {
    if (!editingComm) return;
    
    updateComm.mutate({
      id: editingComm.id,
      data: { subject: editSubject, body: editBody, status: "edited" }
    }, {
      onSuccess: () => {
        toast({ title: "Communication updated successfully" });
        queryClient.invalidateQueries({ queryKey: getListHireTasksQueryKey(editingComm.hireId) });
        setEditingComm(null);
        refetch();
      }
    });
  };

  const handleMarkSent = (comm: ScheduledComm) => {
    markSent.mutate({ id: comm.id }, {
      onSuccess: () => {
        toast({ title: "Marked as sent", description: "The linked hire task was completed automatically." });
        queryClient.invalidateQueries({ queryKey: getListHireTasksQueryKey(comm.hireId) });
        refetch();
      }
    });
  };

  const handleCancel = (comm: ScheduledComm) => {
    updateComm.mutate({
      id: comm.id,
      data: { status: "cancelled" }
    }, {
      onSuccess: () => {
        toast({ title: "Communication cancelled" });
        queryClient.invalidateQueries({ queryKey: getListHireTasksQueryKey(comm.hireId) });
        refetch();
      }
    });
  };

  return (
    <div className="flex-1 p-8 h-screen flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Communications</h1>
          <p className="text-muted-foreground mt-1">Review and manage outgoing messages.</p>
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="edited">Edited (Pending)</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-y-auto pb-10">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : !comms || comms.length === 0 ? (
          <div className="text-center py-20 bg-muted/30 rounded-lg border border-dashed">
            <Mail className="size-10 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium">No communications found</h3>
            <p className="text-muted-foreground mt-1">No scheduled messages match your criteria.</p>
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
            {comms.map(comm => {
              const scheduledDate = parseISO(comm.scheduledAt);
              const isOverdue = isPast(scheduledDate) && (comm.status === 'scheduled' || comm.status === 'edited');
              
              return (
                <Card key={comm.id} className={`overflow-hidden transition-all ${isOverdue ? 'border-amber-500 shadow-[0_0_0_1px_rgba(245,158,11,0.2)]' : ''}`}>
                  <div className="flex flex-col md:flex-row">
                    {/* Status sidebar */}
                    <div className={`md:w-48 p-4 border-b md:border-b-0 md:border-r bg-muted/30 flex flex-col justify-center`}>
                      <div className="mb-2">
                        {comm.status === 'sent' && <Badge className="bg-green-600 hover:bg-green-700 w-full justify-center"><CheckCircle2 className="size-3 mr-1" /> Sent</Badge>}
                        {comm.status === 'scheduled' && <Badge variant="secondary" className="w-full justify-center text-blue-700 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300"><Clock className="size-3 mr-1" /> Scheduled</Badge>}
                        {comm.status === 'edited' && <Badge variant="secondary" className="w-full justify-center border-purple-200 bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"><Edit className="size-3 mr-1" /> Edited</Badge>}
                        {comm.status === 'cancelled' && <Badge variant="destructive" className="w-full justify-center">Cancelled</Badge>}
                      </div>
                      
                      <div className="text-sm font-medium text-center">
                        {format(scheduledDate, "MMM d, yyyy")}
                      </div>
                      
                      {isOverdue && (
                        <div className="mt-2 text-xs font-semibold text-amber-600 flex items-center justify-center bg-amber-100 dark:bg-amber-900/30 py-1 rounded">
                          <AlertCircle className="size-3 mr-1" /> Due Now
                        </div>
                      )}
                    </div>
                    
                    {/* Content area */}
                    <div className="flex-1 p-4 flex flex-col">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-semibold text-lg">{comm.subject}</div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-md">
                              <User className="size-3" />
                              To: {comm.hireName || `Hire #${comm.hireId}`} ({comm.recipientType})
                            </span>
                          </div>
                        </div>
                        
                        {(comm.status === 'scheduled' || comm.status === 'edited') && (
                          <div className="flex items-center gap-2">
                            <Button size="sm" onClick={() => handleMarkSent(comm)} className="hidden sm:flex">
                              <Send className="size-4 mr-2" /> Mark Sent
                            </Button>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-8">
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem className="sm:hidden" onClick={() => handleMarkSent(comm)}>
                                  <Send className="size-4 mr-2" /> Mark Sent
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenEdit(comm)}>
                                  <Edit className="size-4 mr-2" /> Edit Message
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => handleCancel(comm)}>
                                  Cancel Send
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                      
                      <div className="bg-card border rounded-md p-3 text-sm font-mono text-muted-foreground line-clamp-3 mt-auto">
                        {comm.body}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!editingComm} onOpenChange={(open) => !open && setEditingComm(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Scheduled Message</DialogTitle>
          </DialogHeader>
          
          {editingComm && (
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 p-3 rounded-md text-sm flex gap-4">
                <div><span className="font-semibold">To:</span> {editingComm.hireName}</div>
                <div><span className="font-semibold">Scheduled:</span> {format(parseISO(editingComm.scheduledAt), "MMM d, yyyy")}</div>
              </div>
              
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input value={editSubject} onChange={e => setEditSubject(e.target.value)} />
              </div>
              
              <div className="space-y-2">
                <Label>Message Body</Label>
                <Textarea 
                  value={editBody} 
                  onChange={e => setEditBody(e.target.value)} 
                  className="min-h-[250px] font-mono text-sm"
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingComm(null)}>Discard</Button>
            <Button onClick={handleSaveEdit} disabled={updateComm.isPending}>
              {updateComm.isPending ? "Saving..." : "Save Custom Message"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
