-- Add new application roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'management';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'ad_dean';

INSERT INTO public.roles (name, description, level)
VALUES
  ('management', 'University-level management (read/download only)', 60),
  ('ad_dean', 'Associate Dean (college-scoped read/download)', 55)
ON CONFLICT DO NOTHING;

-- Recreate class_reports SELECT policy with new role scopes
DROP POLICY IF EXISTS "Users can view scoped reports" ON public.class_reports;

CREATE POLICY "Users can view scoped reports" ON public.class_reports
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'super_admin') OR
  has_role(auth.uid(), 'management') OR
  (has_role(auth.uid(), 'college_admin') AND department_id IN (SELECT public.get_user_college_department_ids(auth.uid()))) OR
  (has_role(auth.uid(), 'ad_dean') AND department_id IN (SELECT public.get_user_college_department_ids(auth.uid()))) OR
  (has_role(auth.uid(), 'department_head') AND department_id IN (SELECT department_id FROM public.user_departments WHERE user_id = auth.uid())) OR
  (has_role(auth.uid(), 'deputy_department_head') AND department_id IN (SELECT department_id FROM public.user_departments WHERE user_id = auth.uid()))
);

-- Weekly report visibility:
-- - management/super_admin/college_admin: university-wide
-- - ad_dean: scoped to departments under assigned colleges
-- - department_head/deputy: scoped to own departments
DROP POLICY IF EXISTS "Admins and dept heads can view weekly reports" ON public.weekly_department_reports;

CREATE POLICY "Role-scoped users can view weekly reports"
ON public.weekly_department_reports
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'management')
  OR public.has_role(auth.uid(), 'college_admin')
  OR (
    public.has_role(auth.uid(), 'ad_dean')
    AND department_id IN (
      SELECT d.id
      FROM public.departments d
      JOIN public.user_colleges uc ON uc.college_id = d.college_id
      WHERE uc.user_id = auth.uid()
    )
  )
  OR (
    (public.has_role(auth.uid(), 'department_head') OR public.has_role(auth.uid(), 'deputy_department_head'))
    AND department_id IN (
      SELECT department_id FROM public.user_departments WHERE user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Admins and dept heads can view weekly dispatch logs" ON public.weekly_report_dispatch_logs;

CREATE POLICY "Role-scoped users can view weekly dispatch logs"
ON public.weekly_report_dispatch_logs
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'management')
  OR public.has_role(auth.uid(), 'college_admin')
  OR public.has_role(auth.uid(), 'ad_dean')
  OR public.has_role(auth.uid(), 'department_head')
);

