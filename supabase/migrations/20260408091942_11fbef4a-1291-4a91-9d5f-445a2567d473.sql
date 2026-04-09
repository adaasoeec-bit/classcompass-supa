
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
