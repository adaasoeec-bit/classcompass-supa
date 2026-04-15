CREATE TABLE IF NOT EXISTS public.university_instructors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  employee_id TEXT,
  college_id UUID NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (full_name, department_id)
);

ALTER TABLE public.university_instructors ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_university_instructors_college_id ON public.university_instructors(college_id);
CREATE INDEX IF NOT EXISTS idx_university_instructors_department_id ON public.university_instructors(department_id);
CREATE INDEX IF NOT EXISTS idx_university_instructors_is_active ON public.university_instructors(is_active);

CREATE POLICY "Authenticated can view university instructors"
ON public.university_instructors
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage university instructors"
ON public.university_instructors
FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_university_instructors_updated_at
BEFORE UPDATE ON public.university_instructors
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

