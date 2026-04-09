
-- Add deputy_department_head to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'deputy_department_head';

-- Add dept_head_approved status for two-level approval workflow
ALTER TYPE public.report_status ADD VALUE IF NOT EXISTS 'dept_head_approved';
