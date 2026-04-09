import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { isAdmin } from "@/lib/auth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Building2, GraduationCap, BookOpen, Layers, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/organization")({
  component: OrganizationPage,
});

function OrganizationPage() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  if (!user || !isAdmin(user)) return <AppLayout><div className="py-12 text-center text-muted-foreground">Admin access required.</div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organization</h1>
          <p className="text-sm text-muted-foreground">Manage colleges, departments, programs, and courses</p>
        </div>
        <Tabs defaultValue="colleges">
          <TabsList>
            <TabsTrigger value="colleges"><Building2 className="mr-1.5 h-3.5 w-3.5" />Colleges</TabsTrigger>
            <TabsTrigger value="departments"><GraduationCap className="mr-1.5 h-3.5 w-3.5" />Departments</TabsTrigger>
            <TabsTrigger value="programs"><BookOpen className="mr-1.5 h-3.5 w-3.5" />Programs</TabsTrigger>
            <TabsTrigger value="courses"><Layers className="mr-1.5 h-3.5 w-3.5" />Courses</TabsTrigger>
          </TabsList>
          <TabsContent value="colleges"><CollegesTab /></TabsContent>
          <TabsContent value="departments"><DepartmentsTab /></TabsContent>
          <TabsContent value="programs"><ProgramsTab /></TabsContent>
          <TabsContent value="courses"><CoursesTab /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function CollegesTab() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: colleges, isLoading } = useQuery({
    queryKey: ["colleges"],
    queryFn: async () => { const { data } = await supabase.from("colleges").select("*").order("name"); return data || []; },
  });

  const create = useMutation({
    mutationFn: async (fd: FormData) => {
      const { error } = await supabase.from("colleges").insert({
        name: fd.get("name") as string,
        code: fd.get("code") as string,
        description: fd.get("description") as string || null,
        address: fd.get("address") as string || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["colleges"] }); setOpen(false); },
  });

  return (
    <div className="space-y-4 pt-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" />Add College</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add College</DialogTitle></DialogHeader>
            <form onSubmit={e => { e.preventDefault(); create.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
              <div className="space-y-2"><Label>Name</Label><Input name="name" required /></div>
              <div className="space-y-2"><Label>Code</Label><Input name="code" required placeholder="e.g. COE" /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea name="description" rows={2} /></div>
              <div className="space-y-2"><Label>Address</Label><Input name="address" /></div>
              <Button type="submit" className="w-full">Create College</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(colleges || []).map((c: any) => (
            <Card key={c.id} className="stat-card-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10"><Building2 className="h-4 w-4 text-primary" /></div>
                  <div><p className="text-sm font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{c.code}</p></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function DepartmentsTab() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: departments, isLoading } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => { const { data } = await supabase.from("departments").select("*, colleges(name)").order("name"); return data || []; },
  });
  const { data: colleges } = useQuery({
    queryKey: ["colleges"],
    queryFn: async () => { const { data } = await supabase.from("colleges").select("id, name"); return data || []; },
  });

  const create = useMutation({
    mutationFn: async (fd: FormData) => {
      const { error } = await supabase.from("departments").insert({
        name: fd.get("name") as string,
        code: fd.get("code") as string,
        college_id: fd.get("college_id") as string,
        description: fd.get("description") as string || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["departments"] }); setOpen(false); },
  });

  return (
    <div className="space-y-4 pt-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" />Add Department</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Department</DialogTitle></DialogHeader>
            <form onSubmit={e => { e.preventDefault(); create.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
              <div className="space-y-2"><Label>College</Label>
                <Select name="college_id" required><SelectTrigger><SelectValue placeholder="Select college" /></SelectTrigger>
                  <SelectContent>{(colleges || []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Name</Label><Input name="name" required /></div>
              <div className="space-y-2"><Label>Code</Label><Input name="code" required placeholder="e.g. CS" /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea name="description" rows={2} /></div>
              <Button type="submit" className="w-full">Create Department</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(departments || []).map((d: any) => (
            <Card key={d.id} className="stat-card-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent"><GraduationCap className="h-4 w-4 text-primary" /></div>
                  <div><p className="text-sm font-medium">{d.name}</p><p className="text-xs text-muted-foreground">{d.code} · {d.colleges?.name}</p></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ProgramsTab() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: programs, isLoading } = useQuery({
    queryKey: ["programs"],
    queryFn: async () => { const { data } = await supabase.from("programs").select("*, departments(name)").order("name"); return data || []; },
  });
  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => { const { data } = await supabase.from("departments").select("id, name"); return data || []; },
  });

  const create = useMutation({
    mutationFn: async (fd: FormData) => {
      const { error } = await supabase.from("programs").insert({
        name: fd.get("name") as string,
        code: fd.get("code") as string,
        department_id: fd.get("department_id") as string,
        description: fd.get("description") as string || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["programs"] }); setOpen(false); },
  });

  return (
    <div className="space-y-4 pt-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" />Add Program</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Program</DialogTitle></DialogHeader>
            <form onSubmit={e => { e.preventDefault(); create.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
              <div className="space-y-2"><Label>Department</Label>
                <Select name="department_id" required><SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>{(departments || []).map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Name</Label><Input name="name" required /></div>
              <div className="space-y-2"><Label>Code</Label><Input name="code" required /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea name="description" rows={2} /></div>
              <Button type="submit" className="w-full">Create Program</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(programs || []).map((p: any) => (
            <Card key={p.id} className="stat-card-shadow">
              <CardContent className="p-4">
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.code} · {p.departments?.name}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CoursesTab() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editCourse, setEditCourse] = useState<any>(null);
  const [programFilter, setProgramFilter] = useState<string>("all");

  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("*, programs(name, code, departments(name))")
        .order("name");
      return data || [];
    },
  });

  const { data: programs } = useQuery({
    queryKey: ["programs"],
    queryFn: async () => { const { data } = await supabase.from("programs").select("id, name, code"); return data || []; },
  });

  const create = useMutation({
    mutationFn: async (fd: FormData) => {
      const { error } = await supabase.from("courses").insert({
        name: fd.get("name") as string,
        code: fd.get("code") as string,
        program_id: fd.get("program_id") as string,
        credits: parseInt(fd.get("credits") as string) || 3,
        description: fd.get("description") as string || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["courses"] }); setOpen(false); toast.success("Course created"); },
    onError: (e: any) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async (fd: FormData) => {
      const id = fd.get("id") as string;
      const { error } = await supabase.from("courses").update({
        name: fd.get("name") as string,
        code: fd.get("code") as string,
        program_id: fd.get("program_id") as string,
        credits: parseInt(fd.get("credits") as string) || 3,
        description: fd.get("description") as string || null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["courses"] }); setEditCourse(null); toast.success("Course updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  // Group courses by program
  const filteredCourses = (courses || []).filter((c: any) =>
    programFilter === "all" || c.program_id === programFilter
  );

  const groupedByProgram = filteredCourses.reduce((acc: Record<string, any[]>, c: any) => {
    const key = c.programs?.name || "Unknown Program";
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between gap-3">
        <Select value={programFilter} onValueChange={setProgramFilter}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Filter by program" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Programs</SelectItem>
            {(programs || []).map((p: any) => (
              <SelectItem key={p.id} value={p.id}>{p.code} - {p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" />Add Course</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Course</DialogTitle></DialogHeader>
            <form onSubmit={e => { e.preventDefault(); create.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
              <div className="space-y-2"><Label>Program</Label>
                <Select name="program_id" required><SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                  <SelectContent>{(programs || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Name</Label><Input name="name" required /></div>
              <div className="space-y-2"><Label>Code</Label><Input name="code" required /></div>
              <div className="space-y-2"><Label>Credits</Label><Input name="credits" type="number" defaultValue="3" /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea name="description" rows={2} /></div>
              <Button type="submit" className="w-full">Create Course</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Course Dialog */}
      <Dialog open={!!editCourse} onOpenChange={(v) => !v && setEditCourse(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Course</DialogTitle></DialogHeader>
          {editCourse && (
            <form onSubmit={e => { e.preventDefault(); update.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
              <input type="hidden" name="id" value={editCourse.id} />
              <div className="space-y-2"><Label>Program</Label>
                <Select name="program_id" defaultValue={editCourse.program_id}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(programs || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Name</Label><Input name="name" defaultValue={editCourse.name} required /></div>
              <div className="space-y-2"><Label>Code</Label><Input name="code" defaultValue={editCourse.code} required /></div>
              <div className="space-y-2"><Label>Credits</Label><Input name="credits" type="number" defaultValue={editCourse.credits} /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea name="description" defaultValue={editCourse.description || ""} rows={2} /></div>
              <Button type="submit" className="w-full" disabled={update.isPending}>Update Course</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : (
        <Accordion type="multiple" className="space-y-2">
          {Object.entries(groupedByProgram).map(([programName, programCourses]) => (
            <AccordionItem key={programName} value={programName} className="rounded-lg border bg-card">
              <AccordionTrigger className="px-4 text-sm font-medium hover:no-underline">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  {programName}
                  <span className="text-xs text-muted-foreground">({(programCourses as any[]).length} courses)</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="grid gap-2">
                  {(programCourses as any[]).map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.code} · {c.credits} credits</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditCourse(c)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
