-- Add draft status to daily_logs table
ALTER TABLE public.daily_logs
ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT true;

-- Update existing logs to be published (not drafts)
UPDATE public.daily_logs
SET is_draft = false
WHERE is_draft IS NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS daily_logs_is_draft_idx ON public.daily_logs(is_draft);
