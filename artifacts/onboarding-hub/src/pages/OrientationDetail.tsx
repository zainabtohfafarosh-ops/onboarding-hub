import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "wouter";
import { 
  useGetOrientationByDate, 
  useUpdateHire,
  useListHireTasks,
  useUpdateTask,
  Hire,
  HireOrientationType,
  HireStatus
} from "@workspace/api-client-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import { ArrowLeft, Monitor, Laptop, CheckCircle2, Circle, MoreHorizontal, User, Mail, Calendar, CheckSquare } from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { Progress } from "@/components/ui/progress";
import { useQueryClient } from "@tanstack/react-query";
import { getGetOrientationByDateQueryKey, getListHireTasksQueryKey } from "@workspace/api-client-react";

export default function OrientationDetail() {
  const { date } = useParams<{ date: string }>();
  const { data: orientation, isLoading } = useGetOrientationByDate(date || "", {
    query: { enabled: !!date, queryKey: getGetOrientationByDateQueryKey(date || "") }
  });

  if (isLoading) {
    return (
      <div className="flex-1 p-8">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-4 w-48 mb-8" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!orientation) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Orientation not found</h2>
          <Button asChild variant="outline">
            <Link href="/orientations">
              <ArrowLeft className="mr-2 size-4" />
              Back to Calendar
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 flex flex-col h-screen overflow-hidden">
      <div className="mb-6 flex-shrink-0">
        <div className="flex items-center gap-4 mb-2">
          <Button variant="ghost" size="icon" asChild className="size-8">
            <Link href="/orientations">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">
            {format(parseISO(orientation.date), "MMMM d, yyyy")} Cohort
          </h1>
        </div>
        <div className="flex items-center gap-6 text-sm text-muted-foreground ml-12">
          <div className="flex items-center gap-2">
            <User className="size-4" />
            <span className="font-medium text-foreground">{orientation.totalHires} Total Hires</span>
          </div>
          <div className="flex items-center gap-2">
            <Monitor className="size-4 text-blue-500" />
            <span>{orientation.virtualCount} Virtual</span>
          </div>
          <div className="flex items-center gap-2">
            <Laptop className="size-4 text-purple-500" />
            <span>{orientation.inPersonCount} In-Person</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto border rounded-md bg-card shadow-sm">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
            <TableRow>
              <TableHead className="w-[250px]">Hire</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orientation.hires.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  No hires found for this orientation date.
                </TableCell>
              </TableRow>
            ) : (
              orientation.hires.map((hire) => (
                <HireRow key={hire.id} hire={hire} date={date!} />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function HireRow({ hire, date }: { hire: Hire, date: string }) {
  const queryClient = useQueryClient();
  const updateHire = useUpdateHire();
  const { data: tasks } = useListHireTasks(hire.id, {
    query: { enabled: !!hire.id, queryKey: getListHireTasksQueryKey(hire.id) }
  });

  const completedTasks = tasks?.filter(t => t.completed).length || 0;
  const totalTasks = tasks?.length || 0;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const handleStatusChange = (status: HireStatus) => {
    updateHire.mutate({ id: hire.id, data: { status } }, {
      onSuccess: (updatedHire) => {
        // Optimistic update of the orientation query
        queryClient.setQueryData(getGetOrientationByDateQueryKey(date), (old: any) => {
          if (!old) return old;
          return {
            ...old,
            hires: old.hires.map((h: Hire) => h.id === hire.id ? updatedHire : h)
          };
        });
      }
    });
  };

  return (
    <TableRow className="group">
      <TableCell>
        <div className="font-medium text-foreground">
          {hire.firstName} {hire.lastName}
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
          <Mail className="size-3" />
          {hire.email}
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm">{hire.title}</div>
        <div className="text-xs text-muted-foreground mt-1">
          {hire.department && `${hire.department} • `}{hire.location}
        </div>
      </TableCell>
      <TableCell>
        {hire.orientationType === 'virtual' ? (
          <Badge variant="outline" className="bg-blue-50/50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
            <Monitor className="mr-1 size-3" /> Virtual
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-purple-50/50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800">
            <Laptop className="mr-1 size-3" /> In-Person
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <Select 
          defaultValue={hire.status || "pending"} 
          onValueChange={(val) => handleStatusChange(val as HireStatus)}
        >
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="confirmed">
              <div className="flex items-center text-green-600 dark:text-green-400">
                <div className="size-2 rounded-full bg-current mr-2" /> Confirmed
              </div>
            </SelectItem>
            <SelectItem value="pending">
              <div className="flex items-center text-amber-600 dark:text-amber-400">
                <div className="size-2 rounded-full bg-current mr-2" /> Pending
              </div>
            </SelectItem>
            <SelectItem value="cancelled">
              <div className="flex items-center text-red-600 dark:text-red-400">
                <div className="size-2 rounded-full bg-current mr-2" /> Cancelled
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <div className="w-[140px]">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">{completedTasks}/{totalTasks} tasks</span>
            <span className="font-medium">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-1.5" />
        </div>
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href={`/hires/${hire.id}`}>
                <User className="mr-2 size-4" /> View Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/scheduled-comms?hireId=${hire.id}`}>
                <Mail className="mr-2 size-4" /> Manage Comms
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
