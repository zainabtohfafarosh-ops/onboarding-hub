ALTER TABLE "hire_tasks"
  ADD COLUMN IF NOT EXISTS "template_key" text;

CREATE UNIQUE INDEX IF NOT EXISTS "hire_tasks_hire_template_key_idx"
  ON "hire_tasks" ("hire_id", "template_key");