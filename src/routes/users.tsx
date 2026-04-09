import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { isAdmin } from "@/lib/auth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users as UsersIcon, Shield, Link as LinkIcon, Plus, Copy, Trash2 } from "lucide-react";
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
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-sm text-muted-foreground">Manage users, roles, and invite links</p>
        </div>
        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users"><UsersIcon className="mr-2 h-4 w-4" />Users</TabsTrigger>
            <TabsTrigger value="invites"><LinkIcon className="mr-2 h-4 w-4" />Invite Links</TabsTrigger>
          </TabsList>
          <TabsContent value="users" className="mt-4"><UsersList /></TabsContent>
          <TabsContent value="invites" className="mt-4"><InviteLinksSection /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
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
                <p className="truncate text-sm font-medium">{profile.full_name || "Unnamed"}</p>
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

function InviteLinksSection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

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

  const { data: invites, isLoading } = useQuery({
    queryKey: ["invite-links"],
    queryFn: async () => {
      const { data } = await supabase
        .from("invite_links")
        .select("*, roles(name)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const createInvite = useMutation({
    mutationFn: async (formData: FormData) => {
      const { data, error } = await supabase.from("invite_links").insert({
        email: formData.get("email") as string || null,
        role_id: formData.get("role_id") as string || null,
        department_id: formData.get("department_id") as string || null,
        college_id: formData.get("college_id") as string || null,
        created_by: user!.id,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["invite-links"] });
      setOpen(false);
      const link = `${window.location.origin}/register/${data.token}`;
      navigator.clipboard.writeText(link);
      toast.success("Invite link created and copied to clipboard!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invite_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invite-links"] });
      toast.success("Invite deleted");
    },
  });

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/register/${token}`);
    toast.success("Link copied!");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Create Invite Link</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Create Invite Link</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createInvite.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Email (optional - restrict to specific email)</Label>
                <Input name="email" type="email" placeholder="user@university.edu" />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select name="role_id">
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
              <Button type="submit" className="w-full" disabled={createInvite.isPending}>Create & Copy Link</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading...</div>
      ) : (invites || []).length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-3 py-12"><LinkIcon className="h-10 w-10 text-muted-foreground/40" /><p className="text-sm text-muted-foreground">No invite links yet</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {(invites || []).map((inv: any) => (
            <Card key={inv.id} className="stat-card-shadow">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <LinkIcon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{inv.email || "Any email"}</p>
                    <Badge variant={inv.is_active && !inv.used_by ? "default" : "secondary"} className="text-[10px]">
                      {inv.used_by ? "Used" : inv.is_active ? "Active" : "Expired"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {(inv.roles as any)?.name?.replace(/_/g, " ") || "No role"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Expires: {new Date(inv.expires_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-1">
                  {inv.is_active && !inv.used_by && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyLink(inv.token)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteInvite.mutate(inv.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
