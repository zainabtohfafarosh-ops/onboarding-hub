import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, hiresTable, commTemplatesTable } from "@workspace/db";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router = Router();

// POST /ai/draft-comm
// Generates a hire-personalized version of a comm template using Claude
router.post("/ai/draft-comm", async (req, res): Promise<void> => {
  const templateId = Number(req.body?.templateId);
  const hireId = Number(req.body?.hireId);
  if (!templateId || !hireId || isNaN(templateId) || isNaN(hireId)) {
    res.status(400).json({ error: "templateId and hireId are required" });
    return;
  }

  const [template] = await db
    .select()
    .from(commTemplatesTable)
    .where(eq(commTemplatesTable.id, templateId));
  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }

  const [hire] = await db
    .select()
    .from(hiresTable)
    .where(eq(hiresTable.id, hireId));
  if (!hire) {
    res.status(404).json({ error: "Hire not found" });
    return;
  }

  const hireContext = [
    `Name: ${hire.firstName} ${hire.lastName}`,
    `Title: ${hire.title}`,
    hire.department ? `Department: ${hire.department}` : null,
    `Location: ${hire.location}`,
    `Orientation Type: ${hire.orientationType === "in-person" ? "In-Person" : "Virtual"}`,
    `Orientation Date: ${hire.orientationDate}`,
    `Hiring Manager: ${hire.hiringManager}`,
    `Recruiter: ${hire.recruiter}`,
    hire.functionalManager ? `Functional Manager: ${hire.functionalManager}` : null,
    hire.notes ? `Notes: ${hire.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `You are an HR communications specialist for a global company. Personalize this email template for a specific new hire.

HIRE PROFILE:
${hireContext}

ORIGINAL TEMPLATE:
Subject: ${template.subject}

${template.body}

INSTRUCTIONS:
- Replace any placeholder tokens like {hireName}, {managerName}, {orientationDate}, {recruiterName} with the actual hire's information
- Add 1-2 natural, relevant personalized touches based on the hire's role, location, or background — keep them brief
- Maintain the same overall structure, tone, and approximate length as the template
- The email should feel warm and personal but still professional
- Return ONLY a valid JSON object with exactly two string fields: "subject" and "body"
- Do not wrap the JSON in markdown code blocks or any other formatting`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      res.status(500).json({ error: "Unexpected response type from AI" });
      return;
    }

    let result: { subject: string; body: string };
    try {
      result = JSON.parse(content.text);
    } catch {
      const match = content.text.match(/\{[\s\S]*\}/);
      if (match) {
        result = JSON.parse(match[0]);
      } else {
        res.status(500).json({ error: "AI returned an unparseable response" });
        return;
      }
    }

    if (!result.subject || !result.body) {
      res.status(500).json({ error: "AI response missing required fields" });
      return;
    }

    res.json({ subject: result.subject, body: result.body });
  } catch (err) {
    console.error("AI draft error:", err);
    res.status(500).json({ error: "Failed to generate AI draft" });
  }
});

export default router;
