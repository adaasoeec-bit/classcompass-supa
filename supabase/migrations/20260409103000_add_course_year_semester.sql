ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS year_level INT,
  ADD COLUMN IF NOT EXISTS semester TEXT;

CREATE INDEX IF NOT EXISTS idx_courses_year_level ON public.courses(year_level);
CREATE INDEX IF NOT EXISTS idx_courses_semester ON public.courses(semester);

