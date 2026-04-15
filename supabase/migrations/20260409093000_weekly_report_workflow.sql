-- Weekly report approval workflow fields
ALTER TABLE public.weekly_department_reports
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approval_note TEXT;

-- Optional guard for valid statuses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'weekly_department_reports_status_check'
  ) THEN
    ALTER TABLE public.weekly_department_reports
      ADD CONSTRAINT weekly_department_reports_status_check
      CHECK (status IN ('draft', 'submitted', 'approved', 'rejected'));
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_weekly_reports_status ON public.weekly_department_reports(status);

-- Allow update during approval workflow
CREATE POLICY "Admins and dept heads can update weekly reports"
ON public.weekly_department_reports
FOR UPDATE TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.has_role(auth.uid(), 'department_head')
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR public.has_role(auth.uid(), 'department_head')
);

