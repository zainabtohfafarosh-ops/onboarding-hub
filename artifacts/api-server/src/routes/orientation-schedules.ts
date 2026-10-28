import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import sanitizeHtml from "sanitize-html";
import {
  db,
  hiresTable,
  orientationScheduleDraftsTable,
  orientationScheduleTemplatesTable,
  type Hire,
  type OrientationScheduleSnapshot,
  type OrientationScheduleTemplate,
} from "@workspace/db";
import {
  CreateOrientationScheduleTemplateBody,
  CreateOrientationScheduleTemplateResponse,
  GetUpcomingOrientationScheduleWorkspaceResponse,
  ListOrientationScheduleTemplatesResponse,
  RegenerateOrientationScheduleDraftParams,
  RegenerateOrientationScheduleDraftResponse,
  UpdateOrientationScheduleDraftBody,
  UpdateOrientationScheduleDraftParams,
  UpdateOrientationScheduleDraftResponse,
  UpdateOrientationScheduleTemplateBody,
  UpdateOrientationScheduleTemplateParams,
  UpdateOrientationScheduleTemplateResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const sanitizeScheduleHtml = (content: string) =>
  sanitizeHtml(content, {
    allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "h1", "h2", "h3", "section", "hr", "a", "span", "ul", "ol", "li"],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      span: ["data-slack-handle"],
      section: ["data-template-id"],
    },
    allowedSchemes: ["https"],
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: "a",
        attribs: {
          href: attribs.href ?? "",
          target: "_blank",
          rel: "noreferrer noopener",
        },
      }),
    },
  });

const slackMention = (handle: string) =>
  `<span data-slack-handle="${handle}" class="font-medium text-violet-700 dark:text-violet-300">${handle}</span>`;

const defaultTemplates = [
  {
    key: "north-america-standard",
    name: "North America — Standard",
    description: "The default Tuesday orientation agenda for North American new joiners.",
    category: "north-america",
    locations: ["Norwalk", "New York", "Dallas", "Toronto", "Winnipeg", "US Other"],
    audience: "Standard hires",
    timezone: "Eastern Time",
    duration: "10:00 AM – 4:30 PM",
    accent: "blue",
    content: `<p><strong>US/Canada FTE Orientation (ET)</strong><br><u>Day 1 – Tuesday</u><br>Join N Amer Link for <strong>10:00 AM - 4:00 PM</strong><br>10:00 - 11:30 AM IT Set Up<br>11:30 - 12:15 PM People &amp; Culture with ${slackMention("@Juliana.Martins-priceline.com")}<br>12:15 - 12:30 PM Finance with ${slackMention("@Ray.Tebalan-priceline.com")}<br>12:30 - 1:00 PM Compliance with ${slackMention("@martha.radocy-priceline.com")}<br>1:00 - 2:15 PM Lunch Break<br>2:15 - 2:30 PM People Operations with ${slackMention("@michelle.gallas-priceline.com")}<br>2:30 - 3:00 PM Learning &amp; Development with ${slackMention("@Juliana.Martins-priceline.com")}<br>3:00 - 4:00 PM Information Security with ${slackMention("@ayodeji.oludapo-priceline.com")}<br>4:00 - 4:30 PM Time with Manager</p><p><u>Day 2 - Wednesday</u><br>11:00 - 12:00 PM US/CAD Benefits</p>`,
    isActive: true,
  },
  {
    key: "mumbai-standard",
    name: "Mumbai — Standard",
    description: "The standard two-day Mumbai orientation agenda with local facilities, benefits, and people-program sessions.",
    category: "mumbai",
    locations: ["Mumbai"],
    audience: "Standard hires",
    timezone: "India Standard Time",
    duration: "12:30 PM – 8:00 PM",
    accent: "orange",
    content: `<p><strong>Mumbai Orientation (IST)</strong><br>Join Mumbai Link for <strong>12:30 - 7:00 PM (in IST)</strong> <em>{Link Remains the same for both days}</em><br><strong>Meeting Room : Zanskar</strong></p><p><u>Day 1 - Tuesday</u><br>12:30 - 1:45 PM IT Set up with ${slackMention("@vivek.nikam-priceline.com")}<br>1:45 - 2:45 PM Break (Lunch in Cafeteria)<br>2:45 - 3:00 PM HR connect with ${slackMention("@Kritya.Srinivasan-priceline.com")} / ${slackMention("@Meryl.Mathew-priceline.com")}<br>3:00 - 3:30 PM Facilities; In-person Office Tour &amp; Badge Activation with ${slackMention("@malaika.gonsalves-priceline.com")}<br>3:30 - 4:30 PM Information Security with ${slackMention("@vivek.malvankar-priceline.com")}<br>4:30 - 5:15 PM People Operations with ${slackMention("@trisha.gawde-priceline.com")}<br>5:15 - 5:45 PM Break (Snacks in Cafeteria)<br>5:45 - 6:30 PM People &amp; Culture with ${slackMention("@marina.rodrigues-priceline.com")}<br>6:30 - 7:00 PM Compliance with ${slackMention("@martha.radocy-priceline.com")}<br>7:30 - 8:00 PM Time with People Manager</p><p><u>Day 2 - Wednesday</u><br>2:00 - 3:00 PM Benefits with ${slackMention("@sanket.pednekar-priceline.com")}<br>3:00 - 3:15 PM Break<br>3:15 - 3:45 PM L&amp;D with ${slackMention("@Meryl.Mathew-priceline.com")}<br>3:45 - 4:30 PM Payroll with ${slackMention("@gayatri.lalbundre-priceline.com")}</p>`,
    isActive: true,
  },
  {
    key: "coop-north-america",
    name: "Co-op — North America",
    description: "A co-op-focused agenda with added context on learning goals and the placement experience.",
    category: "coop-north-america",
    locations: ["Norwalk", "New York", "Dallas", "Toronto", "US Other"],
    audience: "North American co-ops",
    timezone: "Eastern Time",
    duration: "9:00 AM – 3:30 PM",
    accent: "emerald",
    content: "<p><strong>North America Co-op Orientation (ET)</strong><br><u>Day 1 – Tuesday</u><br>9:00 - 10:00 AM Welcome to the co-op program<br>10:00 - 11:30 AM Company story and culture<br>11:30 - 12:30 PM Working and learning here<br>12:30 - 1:30 PM Lunch Break<br>1:30 - 2:15 PM IT Set Up and Security<br>2:15 - 3:00 PM Meet the co-op community<br>3:00 - 3:30 PM Learning plan and next steps</p>",
    isActive: true,
  },
  {
    key: "coop-winnipeg",
    name: "Co-op — Winnipeg",
    description: "A Winnipeg-specific co-op agenda with local office context and the co-op community panel.",
    category: "coop-winnipeg",
    locations: ["Winnipeg"],
    audience: "Winnipeg co-ops",
    timezone: "Central Time",
    duration: "9:00 AM – 3:30 PM",
    accent: "violet",
    content: "<p><strong>Winnipeg Co-op Orientation (CT)</strong><br><u>Day 1 – Tuesday</u><br>9:00 - 10:00 AM Welcome to the Winnipeg co-op cohort<br>10:00 - 11:30 AM Office and community orientation<br>11:30 - 12:30 PM Working and learning here<br>12:30 - 1:30 PM Lunch Break<br>1:30 - 2:15 PM IT Set Up and Security<br>2:15 - 3:00 PM Meet the co-op community<br>3:00 - 3:30 PM Learning plan and next steps</p>",
    isActive: true,
  },
] as const;

const toTemplateResponse = (template: OrientationScheduleTemplate) => ({
  ...template,
  content: sanitizeScheduleHtml(template.content),
  category: template.category as "north-america" | "mumbai" | "coop-north-america" | "coop-winnipeg" | "special",
  accent: template.accent as "blue" | "orange" | "emerald" | "violet",
  createdAt: template.createdAt.toISOString(),
  updatedAt: template.updatedAt.toISOString(),
});

const toDraftResponse = (draft: typeof orientationScheduleDraftsTable.$inferSelect) => ({
  id: draft.id,
  orientationDate: draft.orientationDate,
  title: draft.title,
  content: sanitizeScheduleHtml(draft.content),
  status: draft.status as "draft" | "ready",
  sourceTemplateIds: draft.sourceTemplateIds,
  cohortSignature: draft.cohortSignature,
  createdAt: draft.createdAt.toISOString(),
  updatedAt: draft.updatedAt.toISOString(),
});

async function ensureDefaultTemplates() {
  await db
    .insert(orientationScheduleTemplatesTable)
    .values(defaultTemplates.map((template) => ({ ...template, locations: [...template.locations] })))
    .onConflictDoNothing();
  return db.select().from(orientationScheduleTemplatesTable);
}

function isCoopHire(hire: Hire) {
  return /\b(co-?op|intern)\b/i.test([hire.title, hire.department, hire.notes].filter(Boolean).join(" "));
}

function findTemplate(hire: Hire, templates: OrientationScheduleTemplate[]) {
  const active = templates.filter((template) => template.isActive);
  const special = active.find(
    (template) => template.category === "special" && template.locations.includes(hire.location),
  );
  if (special) return special;
  if (isCoopHire(hire) && hire.location === "Winnipeg") {
    return active.find(
      (template) => template.category === "coop-winnipeg" && template.locations.includes(hire.location),
    );
  }
  if (isCoopHire(hire)) {
    return active.find(
      (template) => template.category === "coop-north-america" && template.locations.includes(hire.location),
    );
  }
  if (hire.location === "Mumbai") {
    return active.find(
      (template) => template.category === "mumbai" && template.locations.includes(hire.location),
    );
  }
  return active.find(
    (template) => template.category === "north-america" && template.locations.includes(hire.location),
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildWorkspaceContent(
  date: string,
  hires: Hire[],
  groups: Array<{ template: OrientationScheduleTemplate; hires: Hire[] }>,
  unmatchedHires: Hire[],
) {
  const locationSummary = [...new Set(hires.map((hire) => hire.location))].join(" · ");
  const sections = groups.map(({ template, hires: groupHires }) => {
    const hireList = groupHires
      .map((hire) => `${escapeHtml(hire.firstName)} ${escapeHtml(hire.lastName)} (${escapeHtml(hire.location)})`)
      .join(" · ");
    return `<section data-template-id="${template.id}"><h2><strong>${escapeHtml(template.name)}</strong></h2><p><strong>New hires:</strong> ${hireList}</p>${sanitizeScheduleHtml(template.content)}</section>`;
  });
  if (unmatchedHires.length > 0) {
    const names = unmatchedHires
      .map((hire) => `${escapeHtml(hire.firstName)} ${escapeHtml(hire.lastName)} (${escapeHtml(hire.location)})`)
      .join(" · ");
    sections.push(`<section><h2><strong>Template required before posting</strong></h2><p>The following hires do not have a matching schedule: ${names}</p></section>`);
  }
  return sanitizeScheduleHtml(`<h1><strong>Orientation Schedule — ${escapeHtml(date)}</strong></h1><p>${hires.length} new hire${hires.length === 1 ? "" : "s"} · ${escapeHtml(locationSummary)}</p>${sections.join("<hr>")}`);
}

function buildWorkspaceModel(date: string, hires: Hire[], templates: OrientationScheduleTemplate[]) {
  const grouped = new Map<number, { template: OrientationScheduleTemplate; hires: Hire[] }>();
  const missingTemplateLocations = new Set<string>();
  const unmatchedHires: Hire[] = [];
  for (const hire of hires) {
    const template = findTemplate(hire, templates);
    if (!template) {
      missingTemplateLocations.add(hire.location);
      unmatchedHires.push(hire);
      continue;
    }
    const existing = grouped.get(template.id);
    if (existing) existing.hires.push(hire);
    else grouped.set(template.id, { template, hires: [hire] });
  }
  const groups = [...grouped.values()];
  const templateSnapshot: OrientationScheduleSnapshot[] = groups.map(({ template, hires: groupHires }) => ({
    templateId: template.id,
    templateName: template.name,
    category: template.category,
    locations: [...new Set(groupHires.map((hire) => hire.location))],
    hireIds: groupHires.map((hire) => hire.id),
    hireNames: groupHires.map((hire) => `${hire.firstName} ${hire.lastName}`),
  }));
  const cohortSignature = JSON.stringify({
    hires: hires.map((hire) => [hire.id, hire.firstName, hire.lastName, hire.location, hire.title]).sort(),
    templates: groups.map(({ template }) => [template.id, template.updatedAt.toISOString()]).sort(),
  });
  return {
    groups,
    templateSnapshot,
    cohortSignature,
    content: buildWorkspaceContent(date, hires, groups, unmatchedHires),
    missingTemplateLocations: [...missingTemplateLocations],
  };
}

async function getCohort(date?: string) {
  const today = new Date().toISOString().split("T")[0];
  const hires = (await db.select().from(hiresTable))
    .filter((hire) => hire.status !== "cancelled" && hire.orientationDate >= today)
    .sort((a, b) => a.orientationDate.localeCompare(b.orientationDate));
  const orientationDate = date ?? hires[0]?.orientationDate ?? null;
  return {
    orientationDate,
    hires: orientationDate ? hires.filter((hire) => hire.orientationDate === orientationDate) : [],
  };
}

async function generateWorkspace(date?: string, force = false) {
  const templates = await ensureDefaultTemplates();
  const cohort = await getCohort(date);
  if (!cohort.orientationDate || cohort.hires.length === 0) {
    return {
      orientationDate: null,
      totalHires: 0,
      inPersonCount: 0,
      virtualCount: 0,
      locations: [],
      groups: [],
      draft: null,
      missingTemplateLocations: [],
      needsRegeneration: false,
    };
  }

  const model = buildWorkspaceModel(cohort.orientationDate, cohort.hires, templates);
  const [existingDraft] = await db
    .select()
    .from(orientationScheduleDraftsTable)
    .where(eq(orientationScheduleDraftsTable.orientationDate, cohort.orientationDate));
  let draft = existingDraft;

  if (!draft) {
    [draft] = await db
      .insert(orientationScheduleDraftsTable)
      .values({
        orientationDate: cohort.orientationDate,
        title: `Orientation Schedule — ${cohort.orientationDate}`,
        content: model.content,
        status: "draft",
        sourceTemplateIds: model.templateSnapshot.map((snapshot) => snapshot.templateId),
        templateSnapshot: model.templateSnapshot,
        cohortSignature: model.cohortSignature,
      })
      .returning();
  } else if (force) {
    [draft] = await db
      .update(orientationScheduleDraftsTable)
      .set({
        title: `Orientation Schedule — ${cohort.orientationDate}`,
        content: model.content,
        status: "draft",
        sourceTemplateIds: model.templateSnapshot.map((snapshot) => snapshot.templateId),
        templateSnapshot: model.templateSnapshot,
        cohortSignature: model.cohortSignature,
        updatedAt: new Date(),
      })
      .where(eq(orientationScheduleDraftsTable.id, draft.id))
      .returning();
  }

  return {
    orientationDate: cohort.orientationDate,
    totalHires: cohort.hires.length,
    inPersonCount: cohort.hires.filter((hire) => hire.orientationType === "in-person").length,
    virtualCount: cohort.hires.filter((hire) => hire.orientationType === "virtual").length,
    locations: [...new Set(cohort.hires.map((hire) => hire.location))],
    groups: model.templateSnapshot.map((snapshot) => ({
      templateId: snapshot.templateId,
      templateName: snapshot.templateName,
      category: snapshot.category,
      locations: snapshot.locations,
      hireNames: snapshot.hireNames,
    })),
    draft: toDraftResponse(draft),
    missingTemplateLocations: model.missingTemplateLocations,
    needsRegeneration: draft.cohortSignature !== model.cohortSignature,
  };
}

router.get("/orientation-schedule-templates", async (_req, res): Promise<void> => {
  const templates = await ensureDefaultTemplates();
  res.json(ListOrientationScheduleTemplatesResponse.parse(templates.map(toTemplateResponse)));
});

router.post("/orientation-schedule-templates", async (req, res): Promise<void> => {
  const parsed = CreateOrientationScheduleTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [template] = await db
    .insert(orientationScheduleTemplatesTable)
    .values({ ...parsed.data, content: sanitizeScheduleHtml(parsed.data.content) })
    .returning();
  res.status(201).json(CreateOrientationScheduleTemplateResponse.parse(toTemplateResponse(template)));
});

router.patch("/orientation-schedule-templates/:id", async (req, res): Promise<void> => {
  const params = UpdateOrientationScheduleTemplateParams.safeParse(req.params);
  const body = UpdateOrientationScheduleTemplateBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [template] = await db
    .update(orientationScheduleTemplatesTable)
    .set({
      ...body.data,
      ...(body.data.content === undefined ? {} : { content: sanitizeScheduleHtml(body.data.content) }),
      updatedAt: new Date(),
    })
    .where(eq(orientationScheduleTemplatesTable.id, params.data.id))
    .returning();
  if (!template) {
    res.status(404).json({ error: "Orientation schedule template not found" });
    return;
  }
  res.json(UpdateOrientationScheduleTemplateResponse.parse(toTemplateResponse(template)));
});

router.get("/orientation-schedule-workspace", async (_req, res): Promise<void> => {
  res.json(GetUpcomingOrientationScheduleWorkspaceResponse.parse(await generateWorkspace()));
});

router.patch("/orientation-schedule-workspace/:orientationDate", async (req, res): Promise<void> => {
  const params = UpdateOrientationScheduleDraftParams.safeParse(req.params);
  const body = UpdateOrientationScheduleDraftBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  if (body.data.status === "ready") {
    const templates = await ensureDefaultTemplates();
    const cohort = await getCohort(params.data.orientationDate);
    if (!cohort.orientationDate || cohort.hires.length === 0) {
      res.status(404).json({ error: "Upcoming orientation cohort not found" });
      return;
    }
    const model = buildWorkspaceModel(cohort.orientationDate, cohort.hires, templates);
    if (model.missingTemplateLocations.length > 0) {
      res.status(409).json({
        error: `A matching schedule template is required for: ${model.missingTemplateLocations.join(", ")}`,
      });
      return;
    }
  }
  const [draft] = await db
    .update(orientationScheduleDraftsTable)
    .set({
      ...body.data,
      ...(body.data.content === undefined ? {} : { content: sanitizeScheduleHtml(body.data.content) }),
      updatedAt: new Date(),
    })
    .where(eq(orientationScheduleDraftsTable.orientationDate, params.data.orientationDate))
    .returning();
  if (!draft) {
    res.status(404).json({ error: "Orientation schedule draft not found" });
    return;
  }
  res.json(UpdateOrientationScheduleDraftResponse.parse(toDraftResponse(draft)));
});

router.post("/orientation-schedule-workspace/:orientationDate/regenerate", async (req, res): Promise<void> => {
  const params = RegenerateOrientationScheduleDraftParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const workspace = await generateWorkspace(params.data.orientationDate, true);
  if (!workspace.orientationDate) {
    res.status(404).json({ error: "Upcoming orientation cohort not found" });
    return;
  }
  res.json(RegenerateOrientationScheduleDraftResponse.parse(workspace));
});

export default router;