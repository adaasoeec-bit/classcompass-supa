-- =============================================================================
-- ClassCompass / classcompass-supa — run this entire script in Supabase SQL Editor
-- (Dashboard → SQL → New query → Paste → Run)
--
-- Order: migrations 1–6. Migration file 20260409022755 duplicates triggers from
-- earlier files; do NOT run it on a fresh database (see note at end of file).
-- =============================================================================


-- =============================================================================
-- FILE: 20260408090600_1e12de25-2c3f-43bf-a891-0ab54e271306.sql
-- =============================================================================


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


-- =============================================================================
-- FILE: 20260408090611_c5f77a70-9205-4c3e-b36e-62fd9e955ee6.sql
-- =============================================================================


-- Fix overly permissive notification INSERT policy
DROP POLICY "System can create notifications" ON public.notifications;
CREATE POLICY "Authenticated can create notifications" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Fix overly permissive audit log INSERT policy
DROP POLICY "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));


-- =============================================================================
-- FILE: 20260408091942_11fbef4a-1291-4a91-9d5f-445a2567d473.sql
-- =============================================================================


-- Create invite_links table for admin-generated registration links
CREATE TABLE public.invite_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  email text,
  role_id uuid REFERENCES public.roles(id),
  department_id uuid REFERENCES public.departments(id),
  college_id uuid REFERENCES public.colleges(id),
  created_by uuid NOT NULL,
  used_by uuid,
  used_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invite_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invite_links" ON public.invite_links
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Anyone can view active invite by token" ON public.invite_links
  FOR SELECT TO anon, authenticated USING (is_active = true);

-- Function to auto-assign first user as super_admin
CREATE OR REPLACE FUNCTION public.auto_assign_super_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_count integer;
  super_admin_role_id uuid;
BEGIN
  SELECT count(*) INTO user_count FROM public.profiles;
  IF user_count <= 1 THEN
    SELECT id INTO super_admin_role_id FROM public.roles WHERE name = 'super_admin' LIMIT 1;
    IF super_admin_role_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role_id)
      VALUES (NEW.user_id, super_admin_role_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_assign_super_admin
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_super_admin();

-- Function to handle invite link registration
CREATE OR REPLACE FUNCTION public.handle_invite_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  invite_record record;
  invite_token text;
BEGIN
  invite_token := NEW.raw_user_meta_data->>'invite_token';
  IF invite_token IS NOT NULL THEN
    SELECT * INTO invite_record FROM public.invite_links
    WHERE token = invite_token AND is_active = true AND used_by IS NULL AND expires_at > now();
    
    IF invite_record IS NOT NULL THEN
      -- Assign the role
      IF invite_record.role_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role_id)
        VALUES (NEW.id, invite_record.role_id)
        ON CONFLICT DO NOTHING;
      END IF;
      
      -- Assign department
      IF invite_record.department_id IS NOT NULL THEN
        INSERT INTO public.user_departments (user_id, department_id)
        VALUES (NEW.id, invite_record.department_id)
        ON CONFLICT DO NOTHING;
      END IF;
      
      -- Assign college
      IF invite_record.college_id IS NOT NULL THEN
        INSERT INTO public.user_colleges (user_id, college_id)
        VALUES (NEW.id, invite_record.college_id)
        ON CONFLICT DO NOTHING;
      END IF;
      
      -- Mark invite as used
      UPDATE public.invite_links SET used_by = NEW.id, used_at = now(), is_active = false
      WHERE id = invite_record.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_user_created_handle_invite
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_invite_registration();


-- =============================================================================
-- FILE: 20260409011257_871d0d46-ccb9-4d76-9187-855abc4a49cf.sql
-- =============================================================================


-- Add deputy_department_head to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'deputy_department_head';

-- Add dept_head_approved status for two-level approval workflow
ALTER TYPE public.report_status ADD VALUE IF NOT EXISTS 'dept_head_approved';


-- =============================================================================
-- FILE: 20260409011320_6e5794df-b241-47ee-9d73-1494ae5a6647.sql
-- =============================================================================


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


-- =============================================================================
-- FILE: 20260409022336_1cdde563-cd6e-48eb-a841-bda9f6d5051a.sql
-- =============================================================================


ALTER TABLE public.profiles ADD COLUMN must_change_password boolean NOT NULL DEFAULT false;

-- =============================================================================
-- NOTE: 20260409022755_325bb2d7-7c2b-47bb-b601-bd9bb24e9af4.sql is NOT included.
-- It recreates triggers already defined above (on_auth_user_created, profile
-- admin assignment). Running it after this script would error with "already exists".
-- =============================================================================