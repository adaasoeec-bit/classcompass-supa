import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export interface AuthUser {
  id: string;
  email: string;
  profile: Profile | null;
  roles: AppRole[];
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("role_id, roles(name)")
    .eq("user_id", user.id);

  const roles = (userRoles || []).map((ur: any) => ur.roles?.name as AppRole).filter(Boolean);

  return {
    id: user.id,
    email: user.email || "",
    profile,
    roles,
  };
}

export function hasRole(user: AuthUser | null, role: AppRole): boolean {
  return user?.roles.includes(role) ?? false;
}

export function isAdmin(user: AuthUser | null): boolean {
  return hasRole(user, "super_admin") || hasRole(user, "college_admin");
}

export function canApproveReports(user: AuthUser | null): boolean {
  return isAdmin(user) || hasRole(user, "department_head");
}

export function isDeputyHead(user: AuthUser | null): boolean {
  return hasRole(user, "deputy_department_head");
}

export function canCreateReports(user: AuthUser | null): boolean {
  return isDeputyHead(user) || isAdmin(user);
}
