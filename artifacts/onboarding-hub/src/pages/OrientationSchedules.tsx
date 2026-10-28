import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Bold as BoldIcon,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Globe2,
  Italic as ItalicIcon,
  MapPin,
  MessageSquare,
  Monitor,
  Pencil,
  Plus,
  Send,
  Underline as UnderlineIcon,
  UsersRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ScheduleTemplate = {
  id: string;
  name: string;
  description: string;
  category: string;
  locations: string[];
  audience: string;
  timezone: string;
  duration: string;
  accent: string;
  content: string;
};

const slackMention = (handle: string) =>
  `<span data-slack-handle="${handle}" class="font-medium text-violet-700 dark:text-violet-300">${handle}</span>`;

const scheduleTemplates: ScheduleTemplate[] = [
  {
    id: "north-america-standard",
    name: "North America — Standard",
    description: "The default Tuesday orientation agenda for North American new joiners.",
    category: "North America",
    locations: ["Norwalk", "New York", "Dallas", "Toronto", "US-Remote"],
    audience: "Standard hires",
    timezone: "Eastern Time",
    duration: "9:00 AM – 4:00 PM",
    accent: "bg-blue-500",
    content: `<p><strong>US/Canada FTE Orientation (ET)</strong><br><u>Day 1 – Tuesday</u><br>Join N Amer Link for <strong>10:00 AM - 4:00 PM</strong><br>10:00 - 11:30 AM IT Set Up<br>11:30 - 12:15 PM People &amp; Culture with ${slackMention("@Juliana.Martins-priceline.com")}<br>12:15 - 12:30 PM Finance with ${slackMention("@Ray.Tebalan-priceline.com")}<br>12:30 - 1:00 PM Compliance with ${slackMention("@martha.radocy-priceline.com")}<br>1:00 - 2:15 PM Lunch Break<br>2:15 - 2:30 PM People Operations with ${slackMention("@michelle.gallas-priceline.com")}<br>2:30 - 3:00 PM Learning &amp; Development with ${slackMention("@Juliana.Martins-priceline.com")}<br>3:00 - 4:00 PM Information Security with ${slackMention("@ayodeji.oludapo-priceline.com")}<br>4:00 - 4:30 PM Time with Manager</p><p><u>Day 2 - Wednesday</u><br>11:00 - 12:00 PM US/CAD Benefits</p>`,
  },
  {
    id: "mumbai-standard",
    name: "Mumbai — Standard",
    description: "The standard two-day Mumbai orientation agenda with local facilities, benefits, and people-program sessions.",
    category: "Mumbai",
    locations: ["Mumbai"],
    audience: "Standard hires",
    timezone: "India Standard Time",
    duration: "12:30 PM – 8:00 PM",
    accent: "bg-orange-500",
    content: `<p><strong>Mumbai Orientation (IST)</strong><br>Join Mumbai Link for <strong>12:30 - 7:00 PM (in IST)</strong> <em>{Link Remains the same for both days}</em><br><strong>Meeting Room : Zanskar</strong></p><p><u>Day 1 - Tuesday</u><br>12:30 - 1:45 PM IT Set up with ${slackMention("@vivek.nikam-priceline.com")}<br>1:45 - 2:45 PM Break (Lunch in Cafeteria)<br>2:45 - 3:00 PM HR connect with ${slackMention("@Kritya.Srinivasan-priceline.com")} / ${slackMention("@Meryl.Mathew-priceline.com")}<br>3:00 - 3:30 PM Facilities; In-person Office Tour &amp; Badge Activation with ${slackMention("@malaika.gonsalves-priceline.com")}<br>3:30 - 4:30 PM Information Security with ${slackMention("@vivek.malvankar-priceline.com")}<br>4:30 - 5:15 PM People Operations with ${slackMention("@trisha.gawde-priceline.com")}<br>5:15 - 5:45 PM Break (Snacks in Cafeteria)<br>5:45 - 6:30 PM People &amp; Culture with ${slackMention("@marina.rodrigues-priceline.com")}<br>6:30 - 7:00 PM Compliance with ${slackMention("@martha.radocy-priceline.com")}<br>7:30 - 8:00 PM Time with People Manager</p><p><u>Day 2 - Wednesday</u><br>2:00 - 3:00 PM Benefits with ${slackMention("@sanket.pednekar-priceline.com")}<br>3:00 - 3:15 PM Break<br>3:15 - 3:45 PM L&amp;D with ${slackMention("@Meryl.Mathew-priceline.com")}<br>3:45 - 4:30 PM Payroll with ${slackMention("@gayatri.lalbundre-priceline.com")}</p>`,
  },
  {
    id: "coop-north-america",
    name: "Co-op — North America",
    description: "A co-op-focused agenda with added context on learning goals and the placement experience.",
    category: "Co-op",
    locations: ["Norwalk", "New York", "Dallas", "Toronto", "US-Remote"],
    audience: "North American co-ops",
    timezone: "Eastern Time",
    duration: "9:00 AM – 3:30 PM",
    accent: "bg-emerald-500",
    content: `<p><strong>North America Co-op Orientation (ET)</strong><br><u>Day 1 – Tuesday</u><br>9:00 - 10:00 AM Welcome to the co-op program<br>10:00 - 11:30 AM Company story and culture<br>11:30 - 12:30 PM Working and learning here<br>12:30 - 1:30 PM Lunch Break<br>1:30 - 2:15 PM IT Set Up and Security<br>2:15 - 3:00 PM Meet the co-op community<br>3:00 - 3:30 PM Learning plan and next steps</p>`,
  },
  {
    id: "coop-winnipeg",
    name: "Co-op — Winnipeg",
    description: "A Winnipeg-specific co-op agenda with local office context and the co-op community panel.",
    category: "Co-op",
    locations: ["Winnipeg"],
    audience: "Winnipeg co-ops",
    timezone: "Central Time",
    duration: "9:00 AM – 3:30 PM",
    accent: "bg-violet-500",
    content: `<p><strong>Winnipeg Co-op Orientation (CT)</strong><br><u>Day 1 – Tuesday</u><br>9:00 - 10:00 AM Welcome to the Winnipeg co-op cohort<br>10:00 - 11:30 AM Office and community orientation<br>11:30 - 12:30 PM Working and learning here<br>12:30 - 1:30 PM Lunch Break<br>1:30 - 2:15 PM IT Set Up and Security<br>2:15 - 3:00 PM Meet the co-op community<br>3:00 - 3:30 PM Learning plan and next steps</p>`,
  },
];

const filters = ["All templates", "North America", "Mumbai", "Co-op"];

export default function OrientationSchedules() {
  const [activeFilter, setActiveFilter] = useState("All templates");
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(scheduleTemplates.map((template) => [template.id, template.content])),
  );

  const visibleTemplates = useMemo(
    () =>
      activeFilter === "All templates"
        ? scheduleTemplates
        : scheduleTemplates.filter((template) => template.category === activeFilter),
    [activeFilter],
  );

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary">
              <CalendarClock className="size-4" />
              Configuration
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Orientation Schedules</h1>
            <p className="mt-1 max-w-2xl text-muted-foreground">
              Reusable Tuesday agendas for standard, regional, co-op, and special orientation groups.
            </p>
          </div>
          <Button variant="outline" className="gap-2" disabled>
            <Plus className="size-4" />
            Add Schedule Template
          </Button>
        </div>

        <div className="mb-7 flex flex-col gap-4 rounded-xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900 dark:bg-blue-950/20 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-blue-100 p-2 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
              <MessageSquare className="size-5" />
            </div>
            <div>
              <p className="font-semibold text-blue-950 dark:text-blue-100">Template preview</p>
              <p className="mt-0.5 text-sm text-blue-800/80 dark:text-blue-200/80">
                These examples show the shape of the schedule library. Your approved templates can be added here before Slack posting is enabled.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="w-fit shrink-0 border-blue-300 bg-white/70 text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
            Slack not connected
          </Badge>
        </div>

        <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Schedule template library</h2>
                <p className="text-sm text-muted-foreground">{visibleTemplates.length} preview templates</p>
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

            <div className="grid gap-5">
              {visibleTemplates.map((template) => (
                <ScheduleTemplateCard
                  key={template.id}
                  template={template}
                  content={drafts[template.id] ?? template.content}
                  onChange={(content) => setDrafts((current) => ({ ...current, [template.id]: content }))}
                />
              ))}
            </div>
          </section>

          <aside className="space-y-5">
            <Card className="overflow-hidden">
              <div className="h-1 bg-sidebar-primary" />
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Send className="size-4" />
                  Thursday posting preview
                </div>
                <CardTitle className="text-xl">Upcoming orientation</CardTitle>
                <CardDescription>What the weekly Slack message could look like.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5 text-sm">
                  <span className="font-medium">Thursday, August 27</span>
                  <span className="text-muted-foreground">10:00 AM ET</span>
                </div>
                <div className="rounded-lg border bg-white p-4 shadow-sm dark:bg-background">
                  <p className="mb-3 text-sm font-semibold">#new-hire-orientation</p>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="font-semibold">Tuesday, September 1 orientation</p>
                      <p className="text-muted-foreground">4 new joiners · 2 virtual · 2 in-person</p>
                    </div>
                    <div className="border-l-2 border-blue-500 pl-3">
                      <p className="font-medium">North America — Standard</p>
                      <p className="text-muted-foreground">Olivia Bennett · Elena Garcia</p>
                    </div>
                    <div className="border-l-2 border-orange-500 pl-3">
                      <p className="font-medium">Mumbai — Standard</p>
                      <p className="text-muted-foreground">Mei Lin</p>
                    </div>
                    <div className="border-l-2 border-emerald-500 pl-3">
                      <p className="font-medium">North America — Standard</p>
                      <p className="text-muted-foreground">Hassan Rahman · US-Remote</p>
                    </div>
                  </div>
                  <div className="mt-4 border-t pt-3 text-xs text-muted-foreground">
                    Full agendas would be linked from the tracker after posting.
                  </div>
                </div>
                <Button variant="outline" className="mt-4 w-full gap-2" disabled>
                  <MessageSquare className="size-4" />
                  Post to Slack
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Template selection rules</CardTitle>
                <CardDescription>How a schedule can be matched to a cohort.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Rule icon={<MapPin className="size-4 text-orange-500" />} text="Mumbai location uses the Mumbai schedule." />
                <Rule icon={<UsersRound className="size-4 text-emerald-500" />} text="Co-op status selects the relevant co-op schedule." />
                <Rule icon={<Globe2 className="size-4 text-blue-500" />} text="North American hires use the standard regional schedule." />
                <Rule icon={<Monitor className="size-4 text-violet-500" />} text="A time-zone override can select a special agenda." />
              </CardContent>
            </Card>

            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
                <Pencil className="size-4 text-primary" />
                When you provide the real templates
              </div>
              We can replace these examples with saved schedule text, facilitator names, links, and special time-zone rules.
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function ScheduleTemplateCard({
  template,
  content,
  onChange,
}: {
  template: ScheduleTemplate;
  content: string;
  onChange: (content: string) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <div className={`h-1.5 ${template.accent}`} />
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 rounded-lg p-2.5 text-white ${template.accent}`}>
              <CalendarClock className="size-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-xl">{template.name}</CardTitle>
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                  Preview
                </Badge>
              </div>
              <CardDescription className="mt-1 max-w-2xl">{template.description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Pencil className="size-3.5" />
            Editable preview
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1.5">
            <MapPin className="size-3" />
            {template.locations.join(" · ")}
          </Badge>
          <Badge variant="outline" className="gap-1.5">
            <UsersRound className="size-3" />
            {template.audience}
          </Badge>
          <Badge variant="outline" className="gap-1.5">
            <Clock3 className="size-3" />
            {template.timezone} · {template.duration}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <CheckCircle2 className="size-4 text-emerald-500" />
            Schedule text
          </div>
          <div className="text-xs text-muted-foreground">
            Use the toolbar to format text and preserve <span className="font-medium text-violet-700 dark:text-violet-300">@presenter</span> tags.
          </div>
        </div>
        <RichTextEditor content={content} onChange={onChange} />
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Slack-ready:</span>
          <span>presenter handles are kept as mention tokens for later Slack ID matching.</span>
        </div>
      </CardContent>
    </Card>
  );
}

function RichTextEditor({ content, onChange }: { content: string; onChange: (content: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastSyncedContent = useRef(content);

  useLayoutEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = content;
    }
  }, []);

  useLayoutEffect(() => {
    if (!editorRef.current || content === lastSyncedContent.current) return;
    editorRef.current.innerHTML = content;
    lastSyncedContent.current = content;
  }, [content]);

  const runCommand = (command: "bold" | "italic" | "underline") => {
    editorRef.current?.focus();
    document.execCommand(command);
    const nextContent = editorRef.current?.innerHTML ?? content;
    lastSyncedContent.current = nextContent;
    onChange(nextContent);
  };

  return (
    <div className="overflow-hidden rounded-lg border bg-white shadow-sm dark:bg-background">
      <div className="flex flex-wrap items-center gap-1 border-b bg-muted/30 p-2">
        <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Format</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="Bold"
          title="Bold"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => runCommand("bold")}
        >
          <BoldIcon className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="Italic"
          title="Italic"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => runCommand("italic")}
        >
          <ItalicIcon className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="Underline"
          title="Underline"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => runCommand("underline")}
        >
          <UnderlineIcon className="size-4" />
        </Button>
        <span className="ml-2 text-xs text-muted-foreground">Click in the schedule text to revise it.</span>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={(event) => {
          const nextContent = event.currentTarget.innerHTML;
          lastSyncedContent.current = nextContent;
          onChange(nextContent);
        }}
        className="min-h-[250px] p-4 text-sm leading-7 outline-none focus:ring-2 focus:ring-inset focus:ring-primary/20 [&_p]:mb-4 [&_p:last-child]:mb-0 [&_[data-slack-handle]]:font-medium [&_[data-slack-handle]]:text-violet-700 dark:[&_[data-slack-handle]]:text-violet-300"
      />
    </div>
  );
}

function Rule({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <p>{text}</p>
    </div>
  );
}