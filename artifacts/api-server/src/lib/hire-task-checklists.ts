import { and, eq, isNull } from "drizzle-orm";
import { db, hireTasksTable, hiresTable, type Hire, type HireTask } from "@workspace/db";

type DbExecutor = Pick<typeof db, "select" | "insert" | "update" | "delete">;

export type ChecklistTaskDefinition = {
  key: string;
  title: string;
  description: string;
};

const legacyTaskSignatures = new Map<string, { key: string; description: string | RegExp }>([
  ["Send welcome email", {
    key: "common.welcome-email",
    description: "Send the official welcome email to the new hire confirming orientation details.",
  }],
  ["Set up IT accounts", {
    key: "common.it-accounts",
    description: "Create accounts in SSO, corporate email, Slack, and other core systems.",
  }],
  ["Issue security badge / access", {
    key: "in-person.badge-access",
    description: "Provision building badge or system access appropriate for location.",
  }],
  ["Schedule Day 1 check-in", {
    key: "common.day1-check-in",
    description: "Book a 30-min intro call between the recruit, recruiter, and hiring manager.",
  }],
  ["Assign desk and workspace", {
    key: "in-person.desk-workspace",
    description: "Reserve a desk and ensure it is clean and stocked before orientation day.",
  }],
  ["Notify building security of new hire", {
    key: "in-person.building-security",
    description: "Add the hire to the visitor/employee arrival list with their start date.",
  }],
  ["Arrange office orientation tour", {
    key: "in-person.office-tour",
    description: "Schedule a brief walkthrough of the office on orientation day.",
  }],
  ["Send virtual orientation links", {
    key: "virtual.orientation-links",
    description: "Share Zoom/Teams calendar invites and links for all Day 1 sessions.",
  }],
  ["Confirm home office setup", {
    key: "virtual.home-office",
    description: "Verify the hire has adequate equipment and internet access for Day 1.",
  }],
  ["Jamf MDM enrollment", {
    key: "equipment.mac-mdm",
    description: "Enroll the Mac in Jamf for device management and security compliance.",
  }],
  ["Intune MDM enrollment", {
    key: "equipment.pc-mdm",
    description: "Enroll the PC in Microsoft Intune for device management and security policy.",
  }],
  ["Confirm and order laptop", {
    key: "equipment.laptop-order",
    description: "Laptop type not yet selected — confirm Mac or PC preference and place order.",
  }],
]);

function locationKey(location: string) {
  return location.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "other";
}

function normalizeLocation(location: string) {
  const trimmed = location.trim();
  const key = locationKey(trimmed);
  const labels: Record<string, string> = {
    mumbai: "Mumbai",
    norwalk: "Norwalk",
    toronto: "Toronto",
    winnipeg: "Winnipeg",
    "us-other": "US Other",
  };
  return { key, label: labels[key] ?? (trimmed || "Other"), isMumbai: key === "mumbai" };
}

function locationTask(location: ReturnType<typeof normalizeLocation>): ChecklistTaskDefinition {
  return {
    key: `location.${location.key}`,
    title: `Confirm ${location.label} onboarding logistics`,
    description: `Confirm the local onboarding plan and arrival details for the ${location.label} location.`,
  };
}

export function getChecklistTasks(hire: Pick<Hire, "location" | "orientationType" | "laptopType" | "managerInPerson" | "inPersonBuddy">): ChecklistTaskDefinition[] {
  const location = normalizeLocation(hire.location);
  const tasks: ChecklistTaskDefinition[] = [
    {
      key: "common.welcome-email",
      title: "Send welcome email",
      description: "Send the official welcome email to the new hire confirming orientation details.",
    },
    {
      key: "common.it-accounts",
      title: "Set up IT accounts",
      description: "Create accounts in SSO, corporate email, Slack, and other core systems.",
    },
    {
      key: "common.day1-check-in",
      title: "Schedule Day 1 check-in",
      description: "Book a 30-minute intro call between the recruit, recruiter, and hiring manager.",
    },
    locationTask(location),
  ];

  if (hire.orientationType === "in-person") {
    tasks.push(
      {
        key: "in-person.badge-access",
        title: "Issue security badge / access",
        description: `Provision building badge and physical access for the ${location.label} office.`,
      },
      {
        key: "in-person.desk-workspace",
        title: "Assign desk and workspace",
        description: `Reserve a desk and prepare the ${location.label} workspace before orientation day.`,
      },
      {
        key: "in-person.building-security",
        title: "Notify building security of new hire",
        description: `Add the hire to the ${location.label} visitor or employee arrival list with their start date.`,
      },
      {
        key: "in-person.office-tour",
        title: "Arrange office orientation tour",
        description: "Schedule a brief walkthrough of the office on orientation day.",
      },
    );

    if (hire.managerInPerson === false) {
      tasks.push({
        key: "in-person.buddy",
        title: "Brief in-person buddy",
        description: `Brief ${hire.inPersonBuddy || "the assigned buddy"} on their role for orientation day.`,
      });
    }
  } else {
    tasks.push(
      {
        key: "virtual.orientation-links",
        title: "Send virtual orientation links",
        description: "Share Zoom/Teams calendar invites and links for all Day 1 sessions.",
      },
      {
        key: "virtual.home-office",
        title: "Confirm home office setup",
        description: "Verify the hire has adequate equipment and internet access for Day 1.",
      },
    );
  }

  if (location.isMumbai) {
    tasks.push({
      key: "equipment.mumbai-handoff",
      title: "Coordinate Mumbai local equipment handoff",
      description: "Coordinate Mumbai IT equipment and local support instead of North American laptop ordering and shipping.",
    });
  } else if (hire.laptopType === "mac") {
    tasks.push({
      key: "equipment.mac-mdm",
      title: "Jamf MDM enrollment",
      description: "Enroll the Mac in Jamf for device management and security compliance.",
    });
  } else if (hire.laptopType === "pc") {
    tasks.push({
      key: "equipment.pc-mdm",
      title: "Intune MDM enrollment",
      description: "Enroll the PC in Microsoft Intune for device management and security policy.",
    });
  } else {
    tasks.push({
      key: "equipment.laptop-order",
      title: "Confirm and order laptop",
      description: "Laptop type not yet selected — confirm Mac or PC preference and place the order.",
    });
  }

  if (hire.orientationType === "virtual" && !location.isMumbai) {
    tasks.push(
      {
        key: "virtual.laptop-shipment",
        title: "Confirm laptop shipment",
        description: "Confirm the laptop is prepared and on track to arrive before the virtual orientation.",
      },
      {
        key: "virtual.shipping-address",
        title: "Share shipping address with IT",
        description: "Confirm the remote shipping address is available to IT for equipment delivery.",
      },
      {
        key: "virtual.laptop-tracking",
        title: "Send laptop tracking number to hire",
        description: "Share the equipment tracking details with the hire once the shipment is available.",
      },
    );
  }

  return tasks;
}

async function backfillLegacySeedBundle(executor: DbExecutor, hire: Hire, existing: HireTask[]) {
  const keyed = new Set(existing.flatMap((task) => task.templateKey ? [task.templateKey] : []));
  const candidatesByKey = new Map<string, HireTask[]>();

  for (const task of existing) {
    if (task.templateKey !== null || task.scheduledCommId !== null || task.description === null) continue;
    const signature = task.title === "Brief in-person buddy"
      ? {
          key: "in-person.buddy",
          description: /^Brief .+ on their role for orientation day\.$/,
        }
      : legacyTaskSignatures.get(task.title);
    const matchesDescription = signature && (
      typeof signature.description === "string"
        ? signature.description === task.description
        : signature.description.test(task.description)
    );
    if (!signature || !matchesDescription || keyed.has(signature.key)) continue;
    const candidates = candidatesByKey.get(signature.key) ?? [];
    candidates.push(task);
    candidatesByKey.set(signature.key, candidates);
  }

  const unique = (key: string) => candidatesByKey.get(key)?.length === 1;
  const hasCommonBundle = unique("common.welcome-email")
    && unique("common.it-accounts")
    && unique("common.day1-check-in");
  const hasProfileEvidence = [
    "in-person.desk-workspace",
    "in-person.building-security",
    "in-person.office-tour",
    "virtual.orientation-links",
    "virtual.home-office",
    "equipment.mac-mdm",
    "equipment.pc-mdm",
    "equipment.laptop-order",
  ].some(unique);

  if (!hasCommonBundle || !hasProfileEvidence) return new Map<string, HireTask>();

  const migrated = new Map<string, HireTask>();
  for (const [key, candidates] of candidatesByKey) {
    if (candidates.length !== 1 || keyed.has(key)) continue;
    const [updated] = await executor
      .update(hireTasksTable)
      .set({ templateKey: key })
      .where(and(eq(hireTasksTable.id, candidates[0].id), isNull(hireTasksTable.templateKey)))
      .returning();
    if (updated) {
      keyed.add(key);
      migrated.set(key, updated);
    }
  }
  return migrated;
}

export async function reconcileChecklistTasks(executor: DbExecutor, hire: Hire) {
  const existing = await executor
    .select()
    .from(hireTasksTable)
    .where(eq(hireTasksTable.hireId, hire.id));
  const expected = getChecklistTasks(hire);
  const existingByKey = new Map<string, HireTask>();

  for (const task of existing) {
    if (task.templateKey) {
      existingByKey.set(task.templateKey, task);
    }
  }
  const backfilled = await backfillLegacySeedBundle(executor, hire, existing);
  for (const [key, task] of backfilled) existingByKey.set(key, task);

  let created = 0;
  let removed = 0;
  for (const definition of expected) {
    if (existingByKey.has(definition.key)) {
      const task = existingByKey.get(definition.key)!;
      if (!task.completed) {
        await executor
          .update(hireTasksTable)
          .set({ title: definition.title, description: definition.description })
          .where(and(eq(hireTasksTable.id, task.id), eq(hireTasksTable.completed, false)));
      }
      continue;
    }

    const [task] = await executor
      .insert(hireTasksTable)
      .values({
        hireId: hire.id,
        templateKey: definition.key,
        title: definition.title,
        description: definition.description,
        completed: false,
      })
      .onConflictDoNothing({ target: [hireTasksTable.hireId, hireTasksTable.templateKey] })
      .returning();
    if (task) created += 1;
  }

  const expectedKeys = new Set(expected.map((task) => task.key));
  for (const [key, task] of existingByKey) {
    if (!expectedKeys.has(key) && !task.completed) {
      const deleted = await executor
        .delete(hireTasksTable)
        .where(and(eq(hireTasksTable.id, task.id), eq(hireTasksTable.completed, false)))
        .returning({ id: hireTasksTable.id });
      removed += deleted.length;
    }
  }

  return { created, removed };
}

export async function reconcileChecklistTasksForHire(hireId: number) {
  return db.transaction(async (tx) => {
    const [hire] = await tx
      .select()
      .from(hiresTable)
      .where(eq(hiresTable.id, hireId))
      .for("update");
    if (!hire) return { created: 0, removed: 0, hire: null };
    const result = await reconcileChecklistTasks(tx, hire);
    return { ...result, hire };
  });
}