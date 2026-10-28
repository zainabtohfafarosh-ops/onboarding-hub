ALTER TABLE "comm_templates"
  ADD COLUMN IF NOT EXISTS "timing_description" text NOT NULL DEFAULT 'Relative to orientation date';

ALTER TABLE "comm_templates"
  ADD COLUMN IF NOT EXISTS "applicable_to" text NOT NULL DEFAULT 'all';