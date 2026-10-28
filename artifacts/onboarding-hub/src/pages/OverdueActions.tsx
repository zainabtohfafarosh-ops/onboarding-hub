import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { format, parseISO } from "date-fns";
import { AlertTriangle, CheckSquare, Mail, ChevronRight, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface OverdueAction {
  type: "task" | "comm";
  id: number;
  hireId: number;
  hireName: string;
  orientationDate: string | null;
  title: string;
  description: string | null;
  dueDate: string;
  daysPastDue: number;
}

function useOverdueActions() {
  return useQuery<OverdueAction[]>({
    queryKey: ["overdue-actions"],
    queryFn: async () => {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${base}/api/overdue-actions`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch overdue actions");
      return res.json();
    },
    refetchInterval: 30_000,
  });
}

function urgencyColor(days: number) {
  if (days >= 7) return "text-red-600 dark:text-red-400";
  if (days >= 3) return "text-amber-600 dark:text-amber-400";
  return "text-yellow-600 dark:text-yellow-400";
}

function urgencyBg(days: number) {
  if (days >= 7) return "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800";
  if (days >= 3) return "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800";
  return "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800";
}

export default function OverdueActions() {
  const { data: actions, isLoading } = useOverdueActions();

  const taskCount = actions?.filter(a => a.type === "task").length ?? 0;
  const commCount = actions?.filter(a => a.type === "comm").length ?? 0;

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Overdue Actions</h1>
        <p className="text-muted-foreground mt-1">Tasks and communications that have passed their due date.</p>
      </div>

      {/* Summary chips */}
      {!isLoading && actions && (
        <div className="flex gap-3 mb-6">
          <div className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-full border bg-card">
            <CheckSquare className="size-3.5 text-muted-foreground" />
            <span className="font-semibold">{taskCount}</span>
            <span className="text-muted-foreground">overdue task{taskCount !== 1 ? "s" : ""}</span>
          </div>
          <div className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-full border bg-card">
            <Mail className="size-3.5 text-muted-foreground" />
            <span className="font-semibold">{commCount}</span>
            <span className="text-muted-foreground">overdue comm{commCount !== 1 ? "s" : ""}</span>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-red-500" />
            All Overdue Actions
          </CardTitle>
          <CardDescription>Sorted by most days past due</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="px-6 pb-6 space-y-3 pt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !actions?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="size-12 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mb-3">
                <CheckSquare className="size-6 text-emerald-500" />
              </div>
              <p className="font-medium">No overdue actions</p>
              <p className="text-sm text-muted-foreground mt-1">All tasks and communications are on schedule.</p>
            </div>
          ) : (
            <div className="divide-y">
              {/* Column header */}
              <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-4 px-6 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="w-16">Overdue</span>
                <span>Action / Hire</span>
                <span>Due Date</span>
                <span className="w-5" />
              </div>

              {actions.map(action => (
                <Link key={`${action.type}-${action.id}`} href={`/hires/${action.hireId}`} className="block group">
                  <div className={`grid grid-cols-[auto_1fr_auto_auto] gap-x-4 items-center px-6 py-4 hover:bg-muted/40 transition-colors`}>
                    {/* Days past due badge */}
                    <div className={`w-16 text-center rounded-md border px-2 py-1.5 ${urgencyBg(action.daysPastDue)}`}>
                      <div className={`text-lg font-bold tabular-nums leading-none ${urgencyColor(action.daysPastDue)}`}>
                        {action.daysPastDue}
                      </div>
                      <div className="text-[10px] text-muted-foreground leading-none mt-0.5">
                        day{action.daysPastDue !== 1 ? "s" : ""}
                      </div>
                    </div>

                    {/* Title + hire + type */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] h-4 px-1.5 py-0 gap-0.5 shrink-0 ${
                            action.type === "task"
                              ? "border-blue-200 text-blue-700 dark:text-blue-400"
                              : "border-purple-200 text-purple-700 dark:text-purple-400"
                          }`}
                        >
                          {action.type === "task"
                            ? <><CheckSquare className="size-2.5" />Task</>
                            : <><Mail className="size-2.5" />Comm</>}
                        </Badge>
                        <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                          {action.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="truncate">{action.hireName}</span>
                        {action.orientationDate && (
                          <>
                            <span className="text-muted-foreground/40">·</span>
                            <span>Starts {format(parseISO(action.orientationDate), "MMM d")}</span>
                          </>
                        )}
                        {action.description && (
                          <>
                            <span className="text-muted-foreground/40">·</span>
                            <span className="truncate">{action.description}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Due date */}
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                        <Clock className="size-3 shrink-0" />
                        {format(parseISO(action.dueDate), "MMM d, yyyy")}
                      </div>
                    </div>

                    <ChevronRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
