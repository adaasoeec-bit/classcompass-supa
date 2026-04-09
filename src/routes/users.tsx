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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Users as UsersIcon, Shield, Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

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
            <p className="text-sm text-muted-foreground">Add, edit, and manage users and their roles</p>
          </div>
          <AddUserDialog />
        </div>
        <UsersList />
      </div>
    </AppLayout>
  );
}

// Shared hooks for roles, departments, colleges
function useRoles() {
  return useQuery({
    queryKey: ["all-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("roles").select("*").order("level", { ascending: false });
      return data || [];
    },
  });
}

function useDepartments() {
  return useQuery({
    queryKey: ["all-departments"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("id, name, code");
      return data || [];
    },
  });
}

function useColleges() {
  return useQuery({
    queryKey: ["all-colleges"],
    queryFn: async () => {
      const { data } = await supabase.from("colleges").select("id, name, code");
      return data || [];
    },
  });
}

function AddUserDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: roles } = useRoles();
  const { data: departments } = useDepartments();
  const { data: colleges } = useColleges();

  const addUser = useMutation({
    mutationFn: async (formData: FormData) => {
      const email = formData.get("email") as string;
      const fullName = formData.get("full_name") as string;
      const roleId = formData.get("role_id") as string;
      const departmentId = formData.get("department_id") as string || undefined;
      const collegeId = formData.get("college_id") as string || undefined;

      if (!email || !fullName || !roleId) throw new Error("Email, name, and role are required");

      const { data, error } = await supabase.functions.invoke("create-user", {
        body: { email, fullName, roleId, departmentId, collegeId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
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

function EditUserDialog({ profile, onClose }: { profile: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: roles } = useRoles();
  const { data: departments } = useDepartments();
  const { data: colleges } = useColleges();

  const currentRole = profile.user_roles?.[0]?.roles?.name || "";
  const currentRoleId = profile.user_roles?.[0]?.role_id || "";
  const currentDeptId = profile.user_departments?.[0]?.department_id || "";
  const currentCollegeId = profile.user_colleges?.[0]?.college_id || "";

  const [fullName, setFullName] = useState(profile.full_name || "");
  const [email, setEmail] = useState(profile.email || "");
  const [roleId, setRoleId] = useState(currentRoleId);
  const [departmentId, setDepartmentId] = useState(currentDeptId);
  const [collegeId, setCollegeId] = useState(currentCollegeId);

  const updateUser = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("manage-user", {
        body: {
          action: "update",
          userId: profile.user_id,
          fullName,
          email,
          roleId: roleId || undefined,
          departmentId: departmentId || null,
          collegeId: collegeId || null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-profiles"] });
      onClose();
      toast.success("User updated successfully");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Full Name</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Role</Label>
          <Select value={roleId} onValueChange={setRoleId}>
            <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
            <SelectContent>
              {(roles || []).map((r: any) => (
                <SelectItem key={r.id} value={r.id}>{r.name.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Department</Label>
          <Select value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger><SelectValue placeholder="No department" /></SelectTrigger>
            <SelectContent>
              {(departments || []).map((d: any) => (
                <SelectItem key={d.id} value={d.id}>{d.code} - {d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>College</Label>
          <Select value={collegeId} onValueChange={setCollegeId}>
            <SelectTrigger><SelectValue placeholder="No college" /></SelectTrigger>
            <SelectContent>
              {(colleges || []).map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => updateUser.mutate()} disabled={updateUser.isPending}>
            {updateUser.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </div>
    </DialogContent>
  );
}

function UsersList() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [editingProfile, setEditingProfile] = useState<any>(null);

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*, user_roles(role_id, roles(name)), user_departments(department_id), user_colleges(college_id)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("manage-user", {
        body: { action: "delete", userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-profiles"] });
      toast.success("User deleted successfully");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Loading...</div>;

  return (
    <>
      <div className="space-y-3">
        {(profiles || []).map((profile: any) => {
          const currentRole = profile.user_roles?.[0]?.roles?.name || "No role";
          const isSelf = profile.user_id === currentUser?.id;

          return (
            <Card key={profile.id} className="stat-card-shadow">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold uppercase text-primary">
                  {profile.full_name?.[0] || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{profile.full_name || "Unnamed"}</p>
                    {isSelf && <Badge variant="secondary" className="text-[10px]">You</Badge>}
                    {profile.must_change_password && (
                      <Badge variant="outline" className="text-[10px]">Pending Password Change</Badge>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
                </div>
                <Badge variant="outline" className="shrink-0">
                  <Shield className="mr-1 h-3 w-3" />
                  {currentRole.replace(/_/g, " ")}
                </Badge>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setEditingProfile(profile)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {!isSelf && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete User</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete <strong>{profile.full_name}</strong> ({profile.email})? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteUser.mutate(profile.user_id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {(profiles || []).length === 0 && (
          <div className="py-12 text-center text-muted-foreground">No users found. Add your first user above.</div>
        )}
      </div>

      <Dialog open={!!editingProfile} onOpenChange={(open) => !open && setEditingProfile(null)}>
        {editingProfile && (
          <EditUserDialog profile={editingProfile} onClose={() => setEditingProfile(null)} />
        )}
      </Dialog>
    </>
  );
}
