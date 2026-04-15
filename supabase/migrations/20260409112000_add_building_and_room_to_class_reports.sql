ALTER TABLE public.class_reports
  ADD COLUMN IF NOT EXISTS class_building TEXT,
  ADD COLUMN IF NOT EXISTS room_number TEXT;

CREATE INDEX IF NOT EXISTS idx_class_reports_class_building ON public.class_reports(class_building);
CREATE INDEX IF NOT EXISTS idx_class_reports_room_number ON public.class_reports(room_number);

