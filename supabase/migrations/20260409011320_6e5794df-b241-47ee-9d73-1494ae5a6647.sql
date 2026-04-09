
-- Add new columns to class_reports
ALTER TABLE public.class_reports 
  ADD COLUMN IF NOT EXISTS instructor_name text,
  ADD COLUMN IF NOT EXISTS instructor_attended boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS academic_year text,
  ADD COLUMN IF NOT EXISTS section_name text,
  ADD COLUMN IF NOT EXISTS class_hour text,
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id),
  ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id);

-- Make section_id and instructor_id nullable
ALTER TABLE public.class_reports ALTER COLUMN section_id DROP NOT NULL;
ALTER TABLE public.class_reports ALTER COLUMN instructor_id DROP NOT NULL;

-- Insert the deputy_department_head role
INSERT INTO public.roles (name, description, level)
VALUES ('deputy_department_head', 'Deputy Department Head - creates and submits class reports', 25)
ON CONFLICT DO NOTHING;

-- Helper function: get department IDs in a user's college
CREATE OR REPLACE FUNCTION public.get_user_college_department_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT d.id FROM public.departments d
  JOIN public.user_colleges uc ON uc.college_id = d.college_id
  WHERE uc.user_id = _user_id
$$;

-- Drop old instructor-based RLS policies
DROP POLICY IF EXISTS "Instructors can create reports" ON public.class_reports;
DROP POLICY IF EXISTS "Instructors can update own draft reports" ON public.class_reports;
DROP POLICY IF EXISTS "Instructors can view own reports" ON public.class_reports;

-- Deputy dept heads can create reports for their department
CREATE POLICY "Deputy heads can create reports" ON public.class_reports
FOR INSERT TO authenticated
WITH CHECK (
  is_admin(auth.uid()) OR
  (has_role(auth.uid(), 'deputy_department_head') AND 
   department_id IN (SELECT department_id FROM public.user_departments WHERE user_id = auth.uid()))
);

-- View reports scoped by department/college
CREATE POLICY "Users can view scoped reports" ON public.class_reports
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'super_admin') OR
  (has_role(auth.uid(), 'college_admin') AND department_id IN (SELECT public.get_user_college_department_ids(auth.uid()))) OR
  (has_role(auth.uid(), 'department_head') AND department_id IN (SELECT department_id FROM public.user_departments WHERE user_id = auth.uid())) OR
  (has_role(auth.uid(), 'deputy_department_head') AND department_id IN (SELECT department_id FROM public.user_departments WHERE user_id = auth.uid()))
);

-- Update reports based on role
CREATE POLICY "Authorized users can update reports" ON public.class_reports
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'super_admin') OR
  (has_role(auth.uid(), 'college_admin') AND department_id IN (SELECT public.get_user_college_department_ids(auth.uid()))) OR
  (has_role(auth.uid(), 'department_head') AND department_id IN (SELECT department_id FROM public.user_departments WHERE user_id = auth.uid())) OR
  (has_role(auth.uid(), 'deputy_department_head') AND department_id IN (SELECT department_id FROM public.user_departments WHERE user_id = auth.uid()) AND status IN ('draft', 'rejected'))
);

-- Update report_approvals RLS
DROP POLICY IF EXISTS "Reviewers can create approvals" ON public.report_approvals;
DROP POLICY IF EXISTS "Reviewers can update own approvals" ON public.report_approvals;

CREATE POLICY "Dept heads and admins can create approvals" ON public.report_approvals
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = reviewer_id AND
  (has_role(auth.uid(), 'department_head') OR has_role(auth.uid(), 'college_admin') OR has_role(auth.uid(), 'super_admin'))
);

CREATE POLICY "Reviewers can update own approvals" ON public.report_approvals
FOR UPDATE TO authenticated
USING (auth.uid() = reviewer_id);
