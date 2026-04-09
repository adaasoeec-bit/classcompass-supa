
-- Create enums
CREATE TYPE public.app_role AS ENUM ('super_admin', 'college_admin', 'department_head', 'instructor');
CREATE TYPE public.report_status AS ENUM ('draft', 'submitted', 'approved', 'rejected');
CREATE TYPE public.teaching_method AS ENUM ('lecture', 'lab', 'seminar', 'workshop', 'online', 'hybrid', 'tutorial', 'other');
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.notification_type AS ENUM ('info', 'success', 'warning', 'error');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Roles table
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  level INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Permissions table
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- User roles (many-to-many)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role_id)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Role permissions (many-to-many)
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE NOT NULL,
  permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(role_id, permission_id)
);
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Colleges
CREATE TABLE public.colleges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;

-- Departments
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID REFERENCES public.colleges(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  head_id UUID REFERENCES auth.users(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Programs
CREATE TABLE public.programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

-- Courses
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  credits INT NOT NULL DEFAULT 3,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Sections
CREATE TABLE public.sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  instructor_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  semester TEXT,
  academic_year TEXT,
  max_students INT DEFAULT 50,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

-- Class Reports
CREATE TABLE public.class_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE NOT NULL,
  instructor_id UUID REFERENCES auth.users(id) NOT NULL,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIME,
  end_time TIME,
  topic_covered TEXT NOT NULL,
  teaching_method public.teaching_method NOT NULL DEFAULT 'lecture',
  students_present INT NOT NULL DEFAULT 0,
  students_absent INT NOT NULL DEFAULT 0,
  students_total INT NOT NULL DEFAULT 0,
  issues TEXT,
  remarks TEXT,
  attachments TEXT[],
  status public.report_status NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.class_reports ENABLE ROW LEVEL SECURITY;

-- Report Approvals
CREATE TABLE public.report_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES public.class_reports(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES auth.users(id) NOT NULL,
  status public.approval_status NOT NULL DEFAULT 'pending',
  comments TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.report_approvals ENABLE ROW LEVEL SECURITY;

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type public.notification_type NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  related_id UUID,
  related_table TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Audit Logs
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- User-department assignment (for multi-tenant scoping)
CREATE TABLE public.user_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(user_id, department_id)
);
ALTER TABLE public.user_departments ENABLE ROW LEVEL SECURITY;

-- User-college assignment
CREATE TABLE public.user_colleges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  college_id UUID REFERENCES public.colleges(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(user_id, college_id)
);
ALTER TABLE public.user_colleges ENABLE ROW LEVEL SECURITY;

-- ==================== SECURITY DEFINER FUNCTIONS ====================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = _user_id AND r.name = _role::text
  )
$$;

-- Function to check if user is super_admin or college_admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = _user_id AND r.name IN ('super_admin', 'college_admin')
  )
$$;

-- Function to get user's department IDs
CREATE OR REPLACE FUNCTION public.get_user_department_ids(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department_id FROM public.user_departments WHERE user_id = _user_id
$$;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_colleges_updated_at BEFORE UPDATE ON public.colleges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON public.programs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sections_updated_at BEFORE UPDATE ON public.sections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_class_reports_updated_at BEFORE UPDATE ON public.class_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== RLS POLICIES ====================

-- Profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Roles (viewable by all authenticated, managed by admins)
CREATE POLICY "Authenticated users can view roles" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage roles" ON public.roles FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Permissions
CREATE POLICY "Authenticated users can view permissions" ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage permissions" ON public.permissions FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- User Roles
CREATE POLICY "Users can view user_roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage user_roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Role Permissions
CREATE POLICY "Authenticated can view role_permissions" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage role_permissions" ON public.role_permissions FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Colleges
CREATE POLICY "Authenticated can view colleges" ON public.colleges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage colleges" ON public.colleges FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Departments
CREATE POLICY "Authenticated can view departments" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage departments" ON public.departments FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Programs
CREATE POLICY "Authenticated can view programs" ON public.programs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage programs" ON public.programs FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Courses
CREATE POLICY "Authenticated can view courses" ON public.courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage courses" ON public.courses FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Sections
CREATE POLICY "Authenticated can view sections" ON public.sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage sections" ON public.sections FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Class Reports
CREATE POLICY "Instructors can view own reports" ON public.class_reports FOR SELECT TO authenticated
  USING (auth.uid() = instructor_id OR public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'department_head'));
CREATE POLICY "Instructors can create reports" ON public.class_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = instructor_id);
CREATE POLICY "Instructors can update own draft reports" ON public.class_reports FOR UPDATE TO authenticated
  USING (auth.uid() = instructor_id OR public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'department_head'));
CREATE POLICY "Admins can delete reports" ON public.class_reports FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Report Approvals
CREATE POLICY "Users can view relevant approvals" ON public.report_approvals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Reviewers can create approvals" ON public.report_approvals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "Reviewers can update own approvals" ON public.report_approvals FOR UPDATE TO authenticated
  USING (auth.uid() = reviewer_id);

-- Notifications
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Audit Logs
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- User Departments
CREATE POLICY "Users can view user_departments" ON public.user_departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage user_departments" ON public.user_departments FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- User Colleges
CREATE POLICY "Users can view user_colleges" ON public.user_colleges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage user_colleges" ON public.user_colleges FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- ==================== INDEXES ====================
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON public.user_roles(role_id);
CREATE INDEX idx_departments_college_id ON public.departments(college_id);
CREATE INDEX idx_programs_department_id ON public.programs(department_id);
CREATE INDEX idx_courses_program_id ON public.courses(program_id);
CREATE INDEX idx_sections_course_id ON public.sections(course_id);
CREATE INDEX idx_sections_instructor_id ON public.sections(instructor_id);
CREATE INDEX idx_class_reports_section_id ON public.class_reports(section_id);
CREATE INDEX idx_class_reports_instructor_id ON public.class_reports(instructor_id);
CREATE INDEX idx_class_reports_report_date ON public.class_reports(report_date);
CREATE INDEX idx_class_reports_status ON public.class_reports(status);
CREATE INDEX idx_report_approvals_report_id ON public.report_approvals(report_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);

-- ==================== SEED DEFAULT ROLES ====================
INSERT INTO public.roles (name, description, level) VALUES
  ('super_admin', 'Super Administrator with full system access', 100),
  ('college_admin', 'College-level administrator', 75),
  ('department_head', 'Department head with approval authority', 50),
  ('instructor', 'Instructor who submits class reports', 25);

-- ==================== SEED DEFAULT PERMISSIONS ====================
INSERT INTO public.permissions (name, description, resource, action) VALUES
  ('manage_users', 'Create, edit, delete users', 'users', 'manage'),
  ('manage_roles', 'Assign and revoke roles', 'roles', 'manage'),
  ('manage_colleges', 'CRUD colleges', 'colleges', 'manage'),
  ('manage_departments', 'CRUD departments', 'departments', 'manage'),
  ('manage_programs', 'CRUD programs', 'programs', 'manage'),
  ('manage_courses', 'CRUD courses', 'courses', 'manage'),
  ('manage_sections', 'CRUD sections', 'sections', 'manage'),
  ('submit_reports', 'Submit class reports', 'reports', 'submit'),
  ('approve_reports', 'Approve or reject reports', 'reports', 'approve'),
  ('view_all_reports', 'View all reports in scope', 'reports', 'view_all'),
  ('view_analytics', 'View dashboard analytics', 'analytics', 'view'),
  ('manage_notifications', 'Manage system notifications', 'notifications', 'manage'),
  ('view_audit_logs', 'View system audit logs', 'audit_logs', 'view'),
  ('export_reports', 'Export reports to PDF/Excel', 'reports', 'export');

-- Assign permissions to roles
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'super_admin';

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'college_admin' AND p.name IN (
  'manage_departments', 'manage_programs', 'manage_courses', 'manage_sections',
  'approve_reports', 'view_all_reports', 'view_analytics', 'export_reports'
);

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'department_head' AND p.name IN (
  'manage_courses', 'manage_sections', 'approve_reports', 'view_all_reports',
  'view_analytics', 'export_reports'
);

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'instructor' AND p.name IN (
  'submit_reports', 'view_analytics'
);

-- Storage bucket for report attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('report-attachments', 'report-attachments', false);

CREATE POLICY "Users can upload attachments" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'report-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own attachments" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'report-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins can view all attachments" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'report-attachments' AND public.is_admin(auth.uid()));
