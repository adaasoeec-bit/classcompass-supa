import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { isAdmin } from "@/lib/auth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users as UsersIcon, Shield, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { createUserFn } from "@/lib/admin.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/users")({
  component: UsersPage,
});

function UsersPage() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  if (!user || !isAdmin(user)) return <AppLayout><div className="py-12 text-center text-muted-foreground">Admin access required.</div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
            <p className="text-sm text-muted-foreground">Add and manage users and their roles</p>
          </div>
          <AddUserDialog />
        </div>
        <UsersList />
      </div>
    </AppLayout>
  );
}

function AddUserDialog() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const createUser = useServerFn(createUserFn);

  const { data: roles } = useQuery({
    queryKey: ["all-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("roles").select("*").order("level", { ascending: false });
      return data || [];
    },
  });

  const { data: departments } = useQuery({
    queryKey: ["all-departments"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("id, name, code");
      return data || [];
    },
  });

  const { data: colleges } = useQuery({
    queryKey: ["all-colleges"],
    queryFn: async () => {
      const { data } = await supabase.from("colleges").select("id, name, code");
      return data || [];
    },
  });

  const addUser = useMutation({
    mutationFn: async (formData: FormData) => {
      const email = formData.get("email") as string;
      const fullName = formData.get("full_name") as string;
      const roleId = formData.get("role_id") as string;
      const departmentId = formData.get("department_id") as string || undefined;
      const collegeId = formData.get("college_id") as string || undefined;

      if (!email || !fullName || !roleId) throw new Error("Email, name, and role are required");

      return createUser({
        data: { email, fullName, roleId, departmentId, collegeId },
        headers: { authorization: `Bearer ${session?.access_token}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-profiles"] });
      setOpen(false);
      toast.success("User created successfully! Default password: 12345678");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" /> Add User</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add New User</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); addUser.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name *</Label>
            <Input name="full_name" placeholder="John Doe" required />
          </div>
          <div className="space-y-2">
            <Label>Email *</Label>
            <Input name="email" type="email" placeholder="user@university.edu" required />
          </div>
          <div className="space-y-2">
            <Label>Role *</Label>
            <Select name="role_id" required>
              <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
              <SelectContent>
                {(roles || []).map((r: any) => (
                  <SelectItem key={r.id} value={r.id}>{r.name.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Department (optional)</Label>
            <Select name="department_id">
              <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>
                {(departments || []).map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>{d.code} - {d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>College (optional)</Label>
            <Select name="college_id">
              <SelectTrigger><SelectValue placeholder="Select college" /></SelectTrigger>
              <SelectContent>
                {(colleges || []).map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">Default password: <strong>12345678</strong> — user will be required to change it on first login.</p>
          <Button type="submit" className="w-full" disabled={addUser.isPending}>
            {addUser.isPending ? "Creating..." : "Create User"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UsersList() {
  const queryClient = useQueryClient();

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*, user_roles(role_id, roles(name))")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: roles } = useQuery({
    queryKey: ["all-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("roles").select("*").order("level", { ascending: false });
      return data || [];
    },
  });

  const assignRole = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role_id: roleId });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["all-profiles"] }),
  });

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-3">
      {(profiles || []).map((profile: any) => {
        const currentRole = profile.user_roles?.[0]?.roles?.name || "";
        return (
          <Card key={profile.id} className="stat-card-shadow">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold uppercase text-primary">
                {profile.full_name?.[0] || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{profile.full_name || "Unnamed"}</p>
                  {profile.must_change_password && (
                    <Badge variant="outline" className="text-[10px]">Pending Password Change</Badge>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
              </div>
              <Select
                value={currentRole}
                onValueChange={(roleName) => {
                  const role = (roles || []).find((r: any) => r.name === roleName);
                  if (role) assignRole.mutate({ userId: profile.user_id, roleId: role.id });
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <Shield className="mr-2 h-3.5 w-3.5" />
                  <SelectValue placeholder="Assign role" />
                </SelectTrigger>
                <SelectContent>
                  {(roles || []).map((r: any) => (
                    <SelectItem key={r.id} value={r.name}>
                      {r.name.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
