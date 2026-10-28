import type { hiresTable } from "@workspace/db";

export function computeReadiness(
  hire: typeof hiresTable.$inferSelect,
  taskCount: number
): { score: number; missing: string[] } {
  const checks: { label: string; passed: boolean }[] = [];

  checks.push({ label: "Hiring Manager assigned", passed: Boolean(hire.hiringManager) });
  checks.push({ label: "Recruiter assigned", passed: Boolean(hire.recruiter) });

  if (hire.orientationType === "in-person") {
    checks.push({
      label: "Manager attendance confirmed",
      passed: hire.managerInPerson !== null && hire.managerInPerson !== undefined,
    });
    if (hire.managerInPerson === false) {
      checks.push({ label: "In-Person Buddy assigned", passed: Boolean(hire.inPersonBuddy) });
    }
  }

  if (hire.location !== "Mumbai") {
    checks.push({ label: "Laptop type selected", passed: Boolean(hire.laptopType) });
  }

  checks.push({ label: "IT Ticket linked", passed: Boolean(hire.jiraTicketUrl) });
  checks.push({ label: "Tasks assigned", passed: taskCount > 0 });

  const passed = checks.filter(c => c.passed).length;
  const score = checks.length > 0 ? Math.round((passed / checks.length) * 100) : 100;
  const missing = checks.filter(c => !c.passed).map(c => c.label);

  return { score, missing };
}
