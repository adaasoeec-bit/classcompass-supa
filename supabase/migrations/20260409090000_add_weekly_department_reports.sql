-- Weekly department report snapshots
CREATE TABLE IF NOT EXISTS public.weekly_department_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  generated_by UUID REFERENCES auth.users(id),
  total_reports INT NOT NULL DEFAULT 0,
  submitted_reports INT NOT NULL DEFAULT 0,
  approved_reports INT NOT NULL DEFAULT 0,
  rejected_reports INT NOT NULL DEFAULT 0,
  absent_instructor_reports INT NOT NULL DEFAULT 0,
  students_present_total INT NOT NULL DEFAULT 0,
  students_absent_total INT NOT NULL DEFAULT 0,
  students_total_total INT NOT NULL DEFAULT 0,
  attendance_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (department_id, week_start, week_end)
);

ALTER TABLE public.weekly_department_reports ENABLE ROW LEVEL SECURITY;

-- Delivery log for weekly reports
CREATE TABLE IF NOT EXISTS public.weekly_report_dispatch_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_report_id UUID NOT NULL REFERENCES public.weekly_department_reports(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'in_app',
  recipient_count INT NOT NULL DEFAULT 0,
  sent_by UUID REFERENCES auth.users(id),
  result TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.weekly_report_dispatch_logs ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_weekly_reports_department_week ON public.weekly_department_reports(department_id, week_start, week_end);
CREATE INDEX IF NOT EXISTS idx_weekly_dispatch_weekly_report_id ON public.weekly_report_dispatch_logs(weekly_report_id);

-- RLS policies
CREATE POLICY "Admins and dept heads can view weekly reports"
ON public.weekly_department_reports
FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.has_role(auth.uid(), 'department_head')
  OR public.has_role(auth.uid(), 'deputy_department_head')
);

CREATE POLICY "Admins and dept heads can create weekly reports"
ON public.weekly_department_reports
FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin(auth.uid())
  OR public.has_role(auth.uid(), 'department_head')
);

CREATE POLICY "Admins and dept heads can view weekly dispatch logs"
ON public.weekly_report_dispatch_logs
FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.has_role(auth.uid(), 'department_head')
);

CREATE POLICY "Admins and dept heads can insert weekly dispatch logs"
ON public.weekly_report_dispatch_logs
FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin(auth.uid())
  OR public.has_role(auth.uid(), 'department_head')
);

