import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  useGetUpcomingOrientationScheduleWorkspace,
  useRegenerateOrientationScheduleDraft,
  useUpdateOrientationScheduleDraft,
} from "@workspace/api-client-react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  MapPin,
  MessageSquare,
  RefreshCw,
  Save,
  Send,
  UsersRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { RichTextEditor } from "@/components/orientation/RichTextEditor";
import { useToast } from "@/hooks/use-toast";

const groupAccents: Record<string, string> = {
  "north-america": "border-blue-500",
  mumbai: "border-orange-500",
  "coop-north-america": "border-emerald-500",
  "coop-winnipeg": "border-violet-500",
  special: "border-violet-500",
};

export default function UpcomingOrientationSchedule() {
  const { data: workspace, isLoading, refetch } = useGetUpcomingOrientationScheduleWorkspace();
  const updateDraft = useUpdateOrientationScheduleDraft();
  const regenerateDraft = useRegenerateOrientationScheduleDraft();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (!workspace?.draft) return;
    setTitle(workspace.draft.title);
    setContent(workspace.draft.content);
  }, [workspace?.draft?.id, workspace?.draft?.updatedAt]);

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-[1450px] space-y-5">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-[600px] w-full" />
        </div>
      </div>
    );
  }

  if (!workspace?.orientationDate || !workspace.draft) {
    return (
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary">
              <CalendarClock className="size-4" /> Operations
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Upcoming Orientation Schedule</h1>
          </div>
          <Card>
            <CardContent className="py-16 text-center">
              <CalendarClock className="mx-auto mb-4 size-10 text-muted-foreground" />
              <h2 className="text-xl font-semibold">No upcoming cohort</h2>
              <p className="mt-2 text-muted-foreground">A schedule workspace will be generated when the next orientation cohort is available.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const hasChanges = title !== workspace.draft.title || content !== workspace.draft.content;
  const save = (status: "draft" | "ready") => {
    updateDraft.mutate(
      { orientationDate: workspace.orientationDate!, data: { title, content, status } },
      {
        onSuccess: () => {
          toast({ title: status === "ready" ? "Schedule marked ready" : "Schedule draft saved" });
          refetch();
        },
        onError: () => toast({ title: "Schedule could not be saved", variant: "destructive" }),
      },
    );
  };

  const regenerate = () => {
    if (!window.confirm("Replace this cohort draft with the latest templates and hire group? Your draft edits will be lost.")) return;
    regenerateDraft.mutate(
      { orientationDate: workspace.orientationDate! },
      {
        onSuccess: () => {
          toast({ title: "Schedule regenerated from current templates" });
          refetch();
        },
        onError: () => toast({ title: "Schedule could not be regenerated", variant: "destructive" }),
      },
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-[1450px]">
        <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary">
              <CalendarClock className="size-4" /> Operations
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Upcoming Orientation Schedule</h1>
            <p className="mt-1 max-w-3xl text-muted-foreground">
              Review and tailor the generated post for the next class without changing the Configuration templates.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2" onClick={regenerate} disabled={regenerateDraft.isPending}>
              <RefreshCw className="size-4" /> Regenerate from Templates
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => save("draft")} disabled={!hasChanges || updateDraft.isPending}>
              <Save className="size-4" /> Save Draft
            </Button>
            <Button
              className="gap-2"
              onClick={() => save("ready")}
              disabled={updateDraft.isPending || workspace.missingTemplateLocations.length > 0}
              title={workspace.missingTemplateLocations.length > 0 ? "Resolve missing templates before marking ready" : undefined}
            >
              <CheckCircle2 className="size-4" /> Mark Ready
            </Button>
          </div>
        </div>

        {workspace.needsRegeneration && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-semibold">The cohort or source templates changed</p>
              <p className="text-sm opacity-80">Your saved draft is untouched. Regenerate only if you want to replace it with a new snapshot.</p>
            </div>
          </div>
        )}

        <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Next class" value={format(parseISO(workspace.orientationDate), "EEEE, MMMM d")} icon={<CalendarClock className="size-5 text-primary" />} />
          <SummaryCard label="Upcoming hires" value={`${workspace.totalHires}`} subvalue={`${workspace.inPersonCount} in-person · ${workspace.virtualCount} virtual`} icon={<UsersRound className="size-5 text-blue-500" />} />
          <SummaryCard label="Locations" value={`${workspace.locations.length}`} subvalue={workspace.locations.join(" · ")} icon={<MapPin className="size-5 text-orange-500" />} />
          <SummaryCard label="Post status" value={workspace.draft.status === "ready" ? "Ready" : "Draft"} subvalue={`Saved ${format(parseISO(workspace.draft.updatedAt), "MMM d, h:mm a")}`} icon={<MessageSquare className="size-5 text-emerald-500" />} />
        </div>

        <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="overflow-hidden">
            <div className="h-1.5 bg-sidebar-primary" />
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Generated orientation post</CardTitle>
                  <CardDescription className="mt-1">This is a cohort-specific copy. Changes here stay in Operations.</CardDescription>
                </div>
                <Badge variant={workspace.draft.status === "ready" ? "default" : "secondary"}>
                  {workspace.draft.status === "ready" ? "Ready to post" : "Working draft"}
                </Badge>
              </div>
              <Input className="mt-4 text-base font-semibold" value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Schedule post title" />
            </CardHeader>
            <CardContent>
              <RichTextEditor content={content} onChange={setContent} minHeight="min-h-[620px]" />
              <p className="mt-3 text-xs text-muted-foreground">
                Bold, italic, underline, Zoom links, and presenter mention tokens are retained in the saved post.
              </p>
            </CardContent>
          </Card>

          <aside className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Included orientations</CardTitle>
                <CardDescription>Selected from the new-hire group for this class.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {workspace.groups.map((group) => (
                  <div key={group.templateId} className={`border-l-2 pl-3 ${groupAccents[group.category] ?? "border-slate-400"}`}>
                    <p className="font-semibold">{group.templateName}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{group.locations.join(" · ")}</p>
                    <p className="mt-2 text-sm">{group.hireNames.join(" · ")}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {workspace.missingTemplateLocations.length > 0 && (
              <Card className="border-amber-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="size-4 text-amber-600" /> Missing templates</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Add or update a Configuration template for: {workspace.missingTemplateLocations.join(", ")}.
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 text-sm font-semibold text-primary"><Send className="size-4" /> Slack delivery</div>
                <CardTitle className="text-lg">Post when approved</CardTitle>
                <CardDescription>Posting remains disabled until Slack is connected.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full gap-2" disabled>
                  <MessageSquare className="size-4" /> Post to Slack
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  subvalue,
  icon,
}: {
  label: string;
  value: string;
  subvalue?: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-5">
        <div className="rounded-lg bg-muted p-2">{icon}</div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-lg font-bold">{value}</p>
          {subvalue && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{subvalue}</p>}
        </div>
      </CardContent>
    </Card>
  );
}