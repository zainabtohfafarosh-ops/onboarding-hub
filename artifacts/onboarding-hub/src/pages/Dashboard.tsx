import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetDashboard } from "@workspace/api-client-react";
import {
  Users, CalendarDays, CheckSquare, Mail, RefreshCw,
  AlertTriangle, CheckCircle2, ChevronRight, Monitor, Laptop,
  TrendingDown,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, differenceInDays } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";

// Items that block a hire from being ready — shown with red outline
const BLOCKING_MISSING = new Set([
  "Hiring Manager assigned",
  "Recruiter assigned",
  "Manager attendance confirmed",
  "Laptop type selected",
  "IT Ticket linked",
]);

export default function Dashboard() {
  const { data: stats, isLoading } = useGetDashboard();
  const [, navigate] = useLocation();
  const [filterAtRisk, setFilterAtRisk] = useState(true);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const overdueActions = stats?.overdueActions ?? 0;
  const atRiskCount = stats?.readinessAlerts?.length ?? 0;

  // Score color that accounts for urgency: if starting within 2 days and under 80%, force red
  const scoreColor = (score: number, orientationDate: string) => {
    const daysUntil = differenceInDays(parseISO(orientationDate), new Date());
    if (daysUntil <= 1 && score < 80) return "text-red-600 dark:text-red-400";
    if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
    if (score >= 50) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const scoreBarColor = (score: number, orientationDate: string) => {
    const daysUntil = differenceInDays(parseISO(orientationDate), new Date());
    if (daysUntil <= 1 && score < 80) return "[&>div]:bg-red-500";
    if (score >= 80) return "[&>div]:bg-emerald-500";
    if (score >= 50) return "[&>div]:bg-amber-500";
    return "[&>div]:bg-red-500";
  };

  // Only show readiness alerts for hires starting within the next 3 weeks
  const twoWeeksStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return format(d, "yyyy-MM-dd");
  })();
  const visibleAlerts = (stats?.readinessAlerts ?? []).filter(
    a => a.orientationDate <= twoWeeksStr
  );

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
          <p className="text-muted-foreground mt-1">Overview of your onboarding operations.</p>
        </div>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">

        {/* 1. Next Hire Date */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Next Hire Date</CardTitle>
            <CalendarDays className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading || !stats ? (
              <Skeleton className="h-8 w-28" />
            ) : stats.nextOrientationDate ? (
              <>
                <div className="text-2xl font-bold text-foreground">
                  {format(parseISO(stats.nextOrientationDate), "MMMM d, yyyy")}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.nextOrientationCount ?? 0} hire{(stats.nextOrientationCount ?? 0) !== 1 ? "s" : ""} · {differenceInDays(parseISO(stats.nextOrientationDate), new Date()) === 0 ? "Today" : `${differenceInDays(parseISO(stats.nextOrientationDate), new Date())}d away`}
                </p>
              </>
            ) : (
              <div className="text-2xl font-bold text-muted-foreground">None scheduled</div>
            )}
          </CardContent>
        </Card>

        {/* 2. Upcoming Hires */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Hires</CardTitle>
            <Users className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading || !stats ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.totalUpcomingHires} Upcoming</div>
                <p className="text-xs text-muted-foreground mt-1">Across all scheduled dates</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* 3. Overdue Actions — tasks + comms past due */}
        <Link href="/overdue-actions" className="block group">
          <Card className={`transition-shadow group-hover:shadow-md cursor-pointer ${overdueActions > 0 && !isLoading ? "border-red-200 dark:border-red-800" : ""}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Overdue Actions</CardTitle>
              <TrendingDown className={`size-4 ${overdueActions > 0 && !isLoading ? "text-red-500" : "text-primary"}`} />
            </CardHeader>
            <CardContent>
              {isLoading || !stats ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className={`text-2xl font-bold ${overdueActions > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                    {overdueActions}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Tasks &amp; comms past due</p>
                </>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* ── Next Orientation Cohort + Hire Readiness (60/40) ───────── */}
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">

        {/* Left column: cohort + quick actions */}
        <div className="flex flex-col gap-6">

        {/* Next Orientation Cohort */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Next Orientation Cohort</CardTitle>
              {!isLoading && stats?.nextOrientationDate === todayStr && (
                <Badge className="bg-primary text-primary-foreground text-[10px] h-5 px-2">Today</Badge>
              )}
            </div>
            <CardDescription>
              {isLoading || !stats
                ? "Loading…"
                : stats.nextOrientationDate
                ? `${format(parseISO(stats.nextOrientationDate), "MMMM d, yyyy")} · ${stats.nextOrientationCount ?? 0} hire${(stats.nextOrientationCount ?? 0) !== 1 ? "s" : ""}`
                : "No upcoming orientations"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading || !stats ? (
              <div className="px-6 pb-6 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : !stats.nextOrientationHires?.length ? (
              <div className="px-6 pb-6 text-sm text-muted-foreground text-center py-8">
                No hires scheduled for the next orientation.
              </div>
            ) : (
              <div className="divide-y">
                {/* Header row */}
                <div className="grid grid-cols-[1.4fr_1fr_1fr_56px] gap-x-3 px-6 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <span>Name / Title / Location</span>
                  <span>Manager</span>
                  <span>Recruiter</span>
                  <span className="text-center">IT</span>
                </div>
                {stats.nextOrientationHires.map(hire => (
                  <div key={hire.id} className="block group cursor-pointer" onClick={() => navigate(`/hires/${hire.id}`)}>
                    <div className="grid grid-cols-[1.4fr_1fr_1fr_56px] gap-x-3 items-center px-6 py-3 hover:bg-muted/40 transition-colors">
                      {/* Name + title + location · mode */}
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                          {hire.firstName} {hire.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{hire.title}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-xs text-muted-foreground">{hire.location}</span>
                          <span className="text-muted-foreground/40 text-xs">·</span>
                          <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                            hire.orientationType === "in-person"
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {hire.orientationType === "in-person"
                              ? <><Laptop className="size-2.5" />In-Person</>
                              : <><Monitor className="size-2.5" />Virtual</>}
                          </span>
                        </div>
                      </div>
                      {/* Manager */}
                      <div className="text-xs text-muted-foreground truncate">{hire.hiringManager}</div>
                      {/* Recruiter */}
                      <div className="text-xs text-muted-foreground truncate">{hire.recruiter}</div>
                      {/* IT Ticket — status icon */}
                      <div className="flex justify-center">
                        {hire.jiraTicketUrl ? (
                          <a
                            href={hire.jiraTicketUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            title={hire.jiraTicketUrl}
                            className="text-emerald-500 hover:text-emerald-600 transition-colors"
                          >
                            <CheckCircle2 className="size-4" />
                          </a>
                        ) : (
                          <span title="No IT ticket linked" className="text-amber-400">
                            <AlertTriangle className="size-4" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="outline" className="justify-start h-auto py-2.5 px-4" asChild>
              <Link href="/orientations">
                <CalendarDays className="mr-2 size-4 text-primary" />
                View Orientation Calendar
              </Link>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-2.5 px-4" asChild>
              <Link href="/scheduled-comms">
                <Mail className="mr-2 size-4 text-primary" />
                Review Upcoming Communications
              </Link>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-2.5 px-4 flex-col items-start gap-0" asChild>
              <Link href="/sync">
                <span className="flex items-center">
                  <RefreshCw className="mr-2 size-4 text-primary" />
                  Trigger Data Sync
                </span>
                <span className="text-[10px] text-muted-foreground ml-6">Last synced: not yet run</span>
              </Link>
            </Button>
          </CardContent>
        </Card>

        </div>{/* end left column */}

        {/* Hire Readiness */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Hire Readiness
                  {!isLoading && stats && atRiskCount === 0 && (
                    <CheckCircle2 className="size-5 text-emerald-500" />
                  )}
                </CardTitle>
                <CardDescription>
                  Sorted by start date, then readiness score
                </CardDescription>
              </div>
              {!isLoading && stats && atRiskCount > 0 && (
                <button
                  onClick={() => setFilterAtRisk(f => !f)}
                  className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full border transition-colors ${
                    filterAtRisk
                      ? "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-100"
                      : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                  }`}
                >
                  <AlertTriangle className="size-3" />
                  {atRiskCount} need attention
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-4">
            {isLoading || !stats ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : atRiskCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CheckCircle2 className="size-10 text-emerald-500 mb-3" />
                <p className="font-medium">All upcoming hires are fully prepped</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Every profile has the required information and at least one task assigned.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {visibleAlerts.map(alert => (
                  <Link key={alert.hireId} href={`/hires/${alert.hireId}`} className="block">
                    <div className="py-3 flex items-start gap-3 hover:bg-muted/40 -mx-2 px-2 rounded-md transition-colors cursor-pointer group">
                      {/* Score */}
                      <div className="shrink-0 w-10 text-center mt-0.5">
                        <div className={`text-lg font-bold tabular-nums leading-none ${scoreColor(alert.score, alert.orientationDate)}`}>
                          {alert.score}
                        </div>
                        <div className="text-[10px] text-muted-foreground">%</div>
                      </div>

                      {/* Name + date + missing items */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="font-medium text-sm truncate">{alert.hireName}</span>
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0 shrink-0">
                            {format(parseISO(alert.orientationDate), "MMM d")}
                          </Badge>
                        </div>
                        <Progress
                          value={alert.score}
                          className={`h-1 mb-2 ${scoreBarColor(alert.score, alert.orientationDate)}`}
                        />
                        <div className="flex flex-wrap gap-1">
                          {alert.missing.map(item => (
                            <span
                              key={item}
                              className={`inline-flex items-center text-[10px] rounded px-1.5 py-0.5 border ${
                                BLOCKING_MISSING.has(item)
                                  ? "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700"
                                  : "bg-muted text-muted-foreground border-border"
                              }`}
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>

                      <ChevronRight className="size-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
