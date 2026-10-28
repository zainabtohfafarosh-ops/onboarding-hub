import { useEffect, useMemo, useState } from "react";
import {
  useListOrientationScheduleTemplates,
  useUpdateOrientationScheduleTemplate,
  type OrientationScheduleTemplate,
} from "@workspace/api-client-react";
import { CalendarClock, CheckCircle2, Clock3, Database, MapPin, Save, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RichTextEditor } from "@/components/orientation/RichTextEditor";
import { useToast } from "@/hooks/use-toast";

const filters = ["All templates", "North America", "Mumbai", "Co-op", "Special"] as const;

const accentClasses: Record<string, string> = {
  blue: "bg-blue-500",
  orange: "bg-orange-500",
  emerald: "bg-emerald-500",
  violet: "bg-violet-500",
};

export default function OrientationScheduleTemplatesPage() {
  const { data: templates, isLoading, refetch } = useListOrientationScheduleTemplates();
  const updateTemplate = useUpdateOrientationScheduleTemplate();
  const { toast } = useToast();
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("All templates");
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!templates) return;
    setDrafts((current) => {
      const next = { ...current };
      for (const template of templates) {
        if (next[template.id] === undefined) next[template.id] = template.content;
      }
      return next;
    });
  }, [templates]);

  const visibleTemplates = useMemo(
    () => (templates ?? []).filter((template) => matchesFilter(template, activeFilter)),
    [activeFilter, templates],
  );

  const saveTemplate = (template: OrientationScheduleTemplate) => {
    updateTemplate.mutate(
      { id: template.id, data: { content: drafts[template.id] ?? template.content } },
      {
        onSuccess: () => {
          toast({ title: `${template.name} template saved` });
          refetch();
        },
        onError: () => toast({ title: "Template could not be saved", variant: "destructive" }),
      },
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary">
              <Database className="size-4" />
              Configuration
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Orientation Schedule Templates</h1>
            <p className="mt-1 max-w-3xl text-muted-foreground">
              Reusable source schedules for future cohorts. Saving here does not rewrite an existing Operations draft.
            </p>
          </div>
          <Badge variant="outline" className="w-fit gap-2 px-3 py-2">
            <CheckCircle2 className="size-4 text-emerald-500" />
            Saved in the template library
          </Badge>
        </div>

        <div className="mb-7 rounded-xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900 dark:bg-blue-950/20">
          <p className="font-semibold text-blue-950 dark:text-blue-100">Templates are the source of truth</p>
          <p className="mt-1 text-sm text-blue-800/80 dark:text-blue-200/80">
            Operations takes a snapshot when a cohort post is generated. Edit a template here for future or explicitly regenerated posts.
          </p>
        </div>

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Schedule template library</h2>
            <p className="text-sm text-muted-foreground">{visibleTemplates.length} saved template{visibleTemplates.length === 1 ? "" : "s"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <Button
                key={filter}
                size="sm"
                variant={activeFilter === filter ? "default" : "outline"}
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-5">
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        ) : visibleTemplates.length === 0 ? (
          <Card>
            <CardContent className="py-14 text-center text-muted-foreground">
              No templates match this filter.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5">
            {visibleTemplates.map((template) => {
              const draft = drafts[template.id] ?? template.content;
              const hasChanges = draft !== template.content;
              const accentClass = accentClasses[template.accent] ?? "bg-blue-500";
              return (
                <Card key={template.id} className="overflow-hidden">
                  <div className={`h-1.5 ${accentClass}`} />
                  <CardHeader className="pb-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 rounded-lg p-2.5 text-white ${accentClass}`}>
                          <CalendarClock className="size-5" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">{template.name}</CardTitle>
                          <CardDescription className="mt-1 max-w-3xl">{template.description}</CardDescription>
                        </div>
                      </div>
                      <Button
                        className="gap-2"
                        variant={hasChanges ? "default" : "outline"}
                        disabled={!hasChanges || updateTemplate.isPending}
                        onClick={() => saveTemplate(template)}
                      >
                        <Save className="size-4" />
                        Save Template
                      </Button>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge variant="outline" className="gap-1.5"><MapPin className="size-3" />{template.locations.join(" · ")}</Badge>
                      <Badge variant="outline" className="gap-1.5"><UsersRound className="size-3" />{template.audience}</Badge>
                      <Badge variant="outline" className="gap-1.5"><Clock3 className="size-3" />{template.timezone} · {template.duration}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <RichTextEditor
                      content={draft}
                      onChange={(content) => setDrafts((current) => ({ ...current, [template.id]: content }))}
                    />
                    <p className="mt-3 text-xs text-muted-foreground">
                      Links and <span className="font-medium text-violet-700 dark:text-violet-300">@presenter</span> tokens are preserved for future Slack formatting.
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function matchesFilter(template: OrientationScheduleTemplate, filter: (typeof filters)[number]) {
  if (filter === "All templates") return true;
  if (filter === "North America") return template.category === "north-america";
  if (filter === "Mumbai") return template.category === "mumbai";
  if (filter === "Co-op") return template.category.startsWith("coop-");
  return template.category === "special";
}