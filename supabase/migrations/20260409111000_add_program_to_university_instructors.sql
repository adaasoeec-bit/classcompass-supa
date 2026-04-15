ALTER TABLE public.university_instructors
  ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_university_instructors_program_id ON public.university_instructors(program_id);

