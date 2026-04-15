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
import { Plus, Building2, GraduationCap, BookOpen, Layers, Pencil, UserRound } from "lucide-react";
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
            <TabsTrigger value="instructors"><UserRound className="mr-1.5 h-3.5 w-3.5" />Instructors</TabsTrigger>
          </TabsList>
          <TabsContent value="colleges"><CollegesTab /></TabsContent>
          <TabsContent value="departments"><DepartmentsTab /></TabsContent>
          <TabsContent value="programs"><ProgramsTab /></TabsContent>
          <TabsContent value="courses"><CoursesTab /></TabsContent>
          <TabsContent value="instructors"><InstructorsTab /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function InstructorsTab() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editInstructor, setEditInstructor] = useState<any>(null);
  const [selectedCollegeId, setSelectedCollegeId] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [editCollegeId, setEditCollegeId] = useState("");
  const [editDepartmentId, setEditDepartmentId] = useState("");
  const [editProgramId, setEditProgramId] = useState("");

  function downloadInstructorTemplate() {
    const headers = [
      "Full Name",
      "Employee ID",
      "College",
      "Department",
      "Program",
    ];

    const sample = [
      "Abebe Kebede",
      "ASTU-INS-001",
      "College of Electrical Engineering",
      "Electrical and Computer Engineering",
      "Electrical Engineering",
    ];

    const csv = [headers, sample]
      .map((row) => row.map((v) => `"${v}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "instructors_template.csv";
    a.click();
  }

  async function importInstructorsFromCSV(file: File, colleges: any[], departments: any[], programs: any[]) {
    const text = await file.text();
    const parseCsvLine = (line: string) => {
      const cells: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === "," && !inQuotes) {
          cells.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
      cells.push(current.trim());
      return cells.map((c) => c.replace(/(^"|"$)/g, "").trim());
    };

    const normalize = (value: string) => value.toLowerCase().trim();

    const rows = text
      .split(/\r?\n/)
      .map((r) => r.trim())
      .filter(Boolean)
      .map(parseCsvLine)
      .slice(1);

    const insertData: any[] = [];

    for (const row of rows) {
      const [fullName, employeeId, collegeName, departmentName, programName] = row;
      if (!fullName || !collegeName || !departmentName) continue;

      const college = colleges.find((c: any) =>
        normalize(c.name) === normalize(collegeName) || normalize(c.code) === normalize(collegeName)
      );
      const department = departments.find((d: any) =>
        normalize(d.name) === normalize(departmentName) || normalize(d.code) === normalize(departmentName)
      );
      const program = programName
        ? programs.find((p: any) =>
            normalize(p.name) === normalize(programName) || normalize(p.code) === normalize(programName)
          )
        : null;

      if (!college || !department) continue;

      insertData.push({
        full_name: fullName,
        employee_id: employeeId || null,
        college_id: college.id,
        department_id: department.id,
        program_id: program?.id || null,
        is_active: true,
      });
    }

    if (insertData.length === 0) {
      throw new Error("No valid instructor rows found. Use the provided template.");
    }

    const { error } = await supabase.from("university_instructors").upsert(insertData, {
      onConflict: "full_name,department_id",
    });
    if (error) throw error;
  }

  const { data: instructors, isLoading } = useQuery({
    queryKey: ["university-instructors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("university_instructors")
        .select("*, colleges(name, code), departments(name, code), programs(name, code)")
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: colleges } = useQuery({
    queryKey: ["colleges"],
    queryFn: async () => {
      const { data } = await supabase.from("colleges").select("id, name, code").order("name");
      return data || [];
    },
  });

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("id, name, code, college_id").order("name");
      return data || [];
    },
  });

  const { data: programs } = useQuery({
    queryKey: ["programs"],
    queryFn: async () => {
      const { data } = await supabase.from("programs").select("id, name, code, department_id").order("name");
      return data || [];
    },
  });

  const create = useMutation({
    mutationFn: async (fd: FormData) => {
      const { error } = await supabase.from("university_instructors").insert({
        full_name: fd.get("full_name") as string,
        employee_id: (fd.get("employee_id") as string) || null,
        college_id: fd.get("college_id") as string,
        department_id: fd.get("department_id") as string,
        program_id: (fd.get("program_id") as string) || null,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["university-instructors"] });
      setOpen(false);
      setSelectedCollegeId("");
      setSelectedDepartmentId("");
      setSelectedProgramId("");
      toast.success("Instructor added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async (fd: FormData) => {
      const id = fd.get("id") as string;
      const { error } = await supabase.from("university_instructors").update({
        full_name: fd.get("full_name") as string,
        employee_id: (fd.get("employee_id") as string) || null,
        college_id: fd.get("college_id") as string,
        department_id: fd.get("department_id") as string,
        program_id: (fd.get("program_id") as string) || null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["university-instructors"] });
      setEditInstructor(null);
      setEditCollegeId("");
      setEditDepartmentId("");
      setEditProgramId("");
      toast.success("Instructor updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const activeDepartments = (departments || []).filter((d: any) =>
    selectedCollegeId ? d.college_id === selectedCollegeId : true
  );
  const activePrograms = (programs || []).filter((p: any) =>
    selectedDepartmentId
      ? p.department_id === selectedDepartmentId
      : selectedCollegeId
      ? activeDepartments.some((d: any) => d.id === p.department_id)
      : true
  );
  const editPrograms = (programs || []).filter((p: any) =>
    editDepartmentId ? p.department_id === editDepartmentId : true
  );

  const groupedInstructors = (instructors || []).reduce((acc: Record<string, Record<string, any[]>>, ins: any) => {
    const collegeKey = ins.colleges?.name || "Unknown College";
    const programKey = ins.programs?.name || "Unassigned Program";
    if (!acc[collegeKey]) acc[collegeKey] = {};
    if (!acc[collegeKey][programKey]) acc[collegeKey][programKey] = [];
    acc[collegeKey][programKey].push(ins);
    return acc;
  }, {} as Record<string, Record<string, any[]>>);

  const handleImport = async (e: any) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      await importInstructorsFromCSV(file, colleges || [], departments || [], programs || []);
      toast.success("Instructors imported successfully");
      queryClient.invalidateQueries({ queryKey: ["university-instructors"] });
      setImportOpen(false);
      e.target.value = "";
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="flex justify-end gap-2">
        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">Import CSV</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Import Instructors</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Download the template, fill it with instructor, college, department, and optional program values, then upload it.
              </p>
              <Button size="sm" variant="outline" onClick={downloadInstructorTemplate}>Download Template</Button>
              <div>
                <input
                  type="file"
                  accept=".csv"
                  id="instructorCsvInput"
                  className="hidden"
                  onChange={handleImport}
                />
                <Button size="sm" onClick={() => document.getElementById("instructorCsvInput")?.click()}>
                  Upload CSV
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={open} onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) {
            setSelectedCollegeId("");
            setSelectedDepartmentId("");
            setSelectedProgramId("");
          }
        }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" />Add Instructor</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Instructor</DialogTitle></DialogHeader>
            <form onSubmit={e => { e.preventDefault(); create.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
              <input type="hidden" name="college_id" value={selectedCollegeId} />
              <input type="hidden" name="department_id" value={selectedDepartmentId} />
              <input type="hidden" name="program_id" value={selectedProgramId} />
              <div className="space-y-2"><Label>Full Name</Label><Input name="full_name" required /></div>
              <div className="space-y-2"><Label>Employee ID</Label><Input name="employee_id" /></div>
              <div className="space-y-2"><Label>College</Label>
                <Select value={selectedCollegeId} onValueChange={(value) => {
                  setSelectedCollegeId(value);
                  setSelectedDepartmentId("");
                  setSelectedProgramId("");
                }} required>
                  <SelectTrigger><SelectValue placeholder="Select college" /></SelectTrigger>
                  <SelectContent>
                    {(colleges || []).map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Department</Label>
                <Select value={selectedDepartmentId} onValueChange={(value) => {
                  setSelectedDepartmentId(value);
                  setSelectedProgramId("");
                }} required>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {activeDepartments.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>{d.code} - {d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Program (optional)</Label>
                <Select value={selectedProgramId || undefined} onValueChange={setSelectedProgramId}>
                  <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                  <SelectContent>
                    {activePrograms.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.code} - {p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">Create Instructor</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : (
        <Accordion type="multiple" className="space-y-2">
          {Object.entries(groupedInstructors).map(([collegeName, programGroups]) => (
            <AccordionItem key={collegeName} value={collegeName} className="rounded-lg border bg-card">
              <AccordionTrigger className="px-4 text-sm font-medium hover:no-underline">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  {collegeName}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4">
                  {Object.entries(programGroups).map(([programName, instructorsInProgram]) => (
                    <div key={programName} className="rounded-md border">
                      <div className="border-b bg-muted/40 px-4 py-2 text-sm font-semibold">{programName}</div>
                      <div className="grid gap-2 p-3">
                        {(instructorsInProgram as any[]).map((ins: any) => (
                          <div key={ins.id} className="flex items-center justify-between rounded-md border p-3">
                            <div>
                              <p className="text-sm font-medium">{ins.full_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {ins.employee_id ? `${ins.employee_id} · ` : ""}{ins.departments?.code}
                              </p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditInstructor(ins)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      <Dialog open={!!editInstructor} onOpenChange={(v) => {
        if (!v) {
          setEditInstructor(null);
          setEditCollegeId("");
          setEditDepartmentId("");
          setEditProgramId("");
        }
      }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Instructor</DialogTitle></DialogHeader>
          {editInstructor && (
            <form onSubmit={e => { e.preventDefault(); update.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
              <input type="hidden" name="id" value={editInstructor.id} />
              <input type="hidden" name="college_id" value={editCollegeId || editInstructor.college_id} />
              <input type="hidden" name="department_id" value={editDepartmentId || editInstructor.department_id} />
              <input type="hidden" name="program_id" value={editProgramId || editInstructor.program_id || ""} />
              <div className="space-y-2"><Label>Full Name</Label><Input name="full_name" defaultValue={editInstructor.full_name} required /></div>
              <div className="space-y-2"><Label>Employee ID</Label><Input name="employee_id" defaultValue={editInstructor.employee_id || ""} /></div>
              <div className="space-y-2"><Label>College</Label>
                <Select value={editCollegeId || editInstructor.college_id} onValueChange={(value) => {
                  setEditCollegeId(value);
                  setEditDepartmentId("");
                  setEditProgramId("");
                }} required>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(colleges || []).map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Department</Label>
                <Select value={editDepartmentId || editInstructor.department_id} onValueChange={(value) => {
                  setEditDepartmentId(value);
                  setEditProgramId("");
                }} required>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(departments || []).filter((d: any) => {
                      const currentCollegeId = editCollegeId || editInstructor.college_id;
                      return currentCollegeId ? d.college_id === currentCollegeId : true;
                    }).map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>{d.code} - {d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Program (optional)</Label>
                <Select value={editProgramId || editInstructor.program_id || undefined} onValueChange={setEditProgramId}>
                  <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                  <SelectContent>
                    {editPrograms.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.code} - {p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={update.isPending}>Update Instructor</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CollegesTab() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editCollege, setEditCollege] = useState<any>(null);
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

  const update = useMutation({
    mutationFn: async (fd: FormData) => {
      const id = fd.get("id") as string;
      const { error } = await supabase.from("colleges").update({
        name: fd.get("name") as string,
        code: fd.get("code") as string,
        description: fd.get("description") as string || null,
        address: fd.get("address") as string || null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["colleges"] }); setEditCollege(null); toast.success("College updated"); },
    onError: (e: any) => toast.error(e.message),
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
                <div className="mt-2 flex justify-end">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditCollege(c)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={!!editCollege} onOpenChange={(v) => !v && setEditCollege(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit College</DialogTitle></DialogHeader>
          {editCollege && (
            <form onSubmit={e => { e.preventDefault(); update.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
              <input type="hidden" name="id" value={editCollege.id} />
              <div className="space-y-2"><Label>Name</Label><Input name="name" defaultValue={editCollege.name} required /></div>
              <div className="space-y-2"><Label>Code</Label><Input name="code" defaultValue={editCollege.code} required /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea name="description" rows={2} defaultValue={editCollege.description || ""} /></div>
              <div className="space-y-2"><Label>Address</Label><Input name="address" defaultValue={editCollege.address || ""} /></div>
              <Button type="submit" className="w-full" disabled={update.isPending}>Update College</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DepartmentsTab() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editDepartment, setEditDepartment] = useState<any>(null);
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

  const update = useMutation({
    mutationFn: async (fd: FormData) => {
      const id = fd.get("id") as string;
      const { error } = await supabase.from("departments").update({
        name: fd.get("name") as string,
        code: fd.get("code") as string,
        college_id: fd.get("college_id") as string,
        description: fd.get("description") as string || null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["departments"] }); setEditDepartment(null); toast.success("Department updated"); },
    onError: (e: any) => toast.error(e.message),
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
                <div className="mt-2 flex justify-end">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditDepartment(d)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={!!editDepartment} onOpenChange={(v) => !v && setEditDepartment(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Department</DialogTitle></DialogHeader>
          {editDepartment && (
            <form onSubmit={e => { e.preventDefault(); update.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
              <input type="hidden" name="id" value={editDepartment.id} />
              <div className="space-y-2"><Label>College</Label>
                <Select name="college_id" defaultValue={editDepartment.college_id} required><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(colleges || []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Name</Label><Input name="name" defaultValue={editDepartment.name} required /></div>
              <div className="space-y-2"><Label>Code</Label><Input name="code" defaultValue={editDepartment.code} required /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea name="description" rows={2} defaultValue={editDepartment.description || ""} /></div>
              <Button type="submit" className="w-full" disabled={update.isPending}>Update Department</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProgramsTab() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editProgram, setEditProgram] = useState<any>(null);
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

  const update = useMutation({
    mutationFn: async (fd: FormData) => {
      const id = fd.get("id") as string;
      const { error } = await supabase.from("programs").update({
        name: fd.get("name") as string,
        code: fd.get("code") as string,
        department_id: fd.get("department_id") as string,
        description: fd.get("description") as string || null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["programs"] }); setEditProgram(null); toast.success("Program updated"); },
    onError: (e: any) => toast.error(e.message),
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
                <div className="mt-2 flex justify-end">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditProgram(p)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={!!editProgram} onOpenChange={(v) => !v && setEditProgram(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Program</DialogTitle></DialogHeader>
          {editProgram && (
            <form onSubmit={e => { e.preventDefault(); update.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
              <input type="hidden" name="id" value={editProgram.id} />
              <div className="space-y-2"><Label>Department</Label>
                <Select name="department_id" defaultValue={editProgram.department_id} required><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(departments || []).map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Name</Label><Input name="name" defaultValue={editProgram.name} required /></div>
              <div className="space-y-2"><Label>Code</Label><Input name="code" defaultValue={editProgram.code} required /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea name="description" rows={2} defaultValue={editProgram.description || ""} /></div>
              <Button type="submit" className="w-full" disabled={update.isPending}>Update Program</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ✅ PLACE HERE (top of file)
function downloadCourseTemplate() {
  const headers = [
    "Course Code",
    "Course Name",
    "Program",
    "Department",
    "Year",
    "Semester",
    "Credits",
    "Description",
  ];

  const sample = [
    "CS101",
    "Introduction to Programming",
    "Computer Science",
    "Software Engineering",
    "1",
    "1",
    "3",
    "Basic programming course",
  ];

  const csv = [headers, sample]
    .map(row => row.map(v => `"${v}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "course_template.csv";
  a.click();
}

function exportCoursesToCSV(courses: any[]) {
  const toRoman = (value: string | number | null | undefined) => {
    const num = Number(value);
    const map: Record<number, string> = {
      1: "I",
      2: "II",
      3: "III",
      4: "IV",
      5: "V",
      6: "VI",
      7: "VII",
      8: "VIII",
    };
    return map[num] || String(value || "");
  };

  const grouped = (courses || []).reduce((acc: Record<string, Record<string, any[]>>, c: any) => {
    const program = c.programs?.name || "Unknown Program";
    const yearSem = `${c.year_level || "N/A"}|${c.semester || "N/A"}`;
    if (!acc[program]) acc[program] = {};
    if (!acc[program][yearSem]) acc[program][yearSem] = [];
    acc[program][yearSem].push(c);
    return acc;
  }, {} as Record<string, Record<string, any[]>>);

  const csvRows: string[][] = [];

  Object.entries(grouped).forEach(([program, yearSemGroups], programIndex) => {
    csvRows.push([`Program: ${program}`]);

    Object.entries(yearSemGroups)
      .sort(([a], [b]) => {
        const [aYear, aSem] = a.split("|");
        const [bYear, bSem] = b.split("|");
        const yearDiff = Number(aYear || 0) - Number(bYear || 0);
        if (yearDiff !== 0) return yearDiff;
        return String(aSem).localeCompare(String(bSem));
      })
      .forEach(([yearSemKey, list]) => {
        const [year, sem] = yearSemKey.split("|");
        csvRows.push([`Year ${toRoman(year)}, Semester ${toRoman(sem)}`]);
        csvRows.push(["Course Code", "Course Title", "Cr. Hr", "Description"]);
        (list as any[]).forEach((c) => {
          csvRows.push([
            c.code || "",
            c.name || "",
            String(c.credits || ""),
            c.description || "",
          ]);
        });
        csvRows.push([]);
      });

    if (programIndex < Object.keys(grouped).length - 1) {
      csvRows.push([]);
    }
  });

  const csv = csvRows
    .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "courses.csv";
  a.click();
}

async function importCoursesFromCSV(file: File, programs: any[]) {
  const text = await file.text();

  const parseCsvLine = (line: string) => {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        cells.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    cells.push(current.trim());
    return cells.map((c) => c.replace(/(^"|"$)/g, "").trim());
  };

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const rows = lines.map(parseCsvLine);

  const insertData: any[] = [];
  let currentProgramName = "";
  let currentYear = "";
  let currentSemester = "";

  const normalize = (v: string) => (v || "").toLowerCase().trim();

  for (const r of rows) {
    // Context rows from grouped export
    if (r[0]?.startsWith("Program:")) {
      currentProgramName = r[0].replace("Program:", "").trim();
      continue;
    }
    if (r[0]?.toLowerCase().startsWith("year ")) {
      const m = r[0].match(/year\s+([ivx0-9]+)\s*,\s*semester\s+([ivx0-9]+)/i);
      if (m) {
        currentYear = m[1].trim();
        currentSemester = m[2].trim();
      }
      continue;
    }

    // Header rows
    const c0 = normalize(r[0]);
    if (
      c0 === "course code" ||
      c0 === "date" ||
      c0 === "adama science and technology university" ||
      c0 === "college of electrical engineering" ||
      c0 === "daily class report" ||
      c0 === "weekly class report" ||
      c0 === "generated:"
    ) {
      continue;
    }

    // Flat template format: code,name,program,department,year,semester,credits,description
    if (r.length >= 7) {
      const [code, name, programNameOrCode, _department, year, semester, credits, description] = r;
      const program = programs.find((p) => {
        const pn = normalize(p.name);
        const pc = normalize(p.code);
        const lookup = normalize(programNameOrCode);
        return pn === lookup || pc === lookup;
      });
      if (!program || !code || !name) continue;

      insertData.push({
        code,
        name,
        program_id: program.id,
        year_level: year ? parseInt(year) || null : null,
        semester: semester || null,
        credits: parseInt(credits || "") || 3,
        description: description || null,
      });
      continue;
    }

    // Grouped export format row: code,title,crhr,description with context from Program/Year/Semester lines
    if (r.length >= 3 && currentProgramName) {
      const [code, name, credits, description] = r;
      if (!code || !name) continue;
      const program = programs.find((p) => {
        const pn = normalize(p.name);
        const pc = normalize(p.code);
        const lookup = normalize(currentProgramName);
        return pn === lookup || pc === lookup;
      });
      if (!program) continue;

      insertData.push({
        code,
        name,
        program_id: program.id,
        year_level: currentYear ? parseInt(currentYear) || null : null,
        semester: currentSemester || null,
        credits: parseInt(credits || "") || 3,
        description: description || null,
      });
    }
  }

  if (insertData.length === 0) {
    throw new Error("No valid rows found. Use the provided template or grouped export format.");
  }

  // Upsert by unique course code to avoid duplicate-key import failures.
  // Existing courses are updated; new codes are inserted.
  const { error } = await supabase.from("courses").upsert(insertData, { onConflict: "code" });

  if (error) throw error;
}

function CoursesTab() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
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

  const handleImport = async (e: any) => {
    try {
      const file = e.target.files[0];
      if (!file) return;
  
      if (!programs || programs.length === 0) {
        toast.error("Programs not loaded yet");
        return;
      }
  
      await importCoursesFromCSV(file, programs);
  
      toast.success("Courses imported successfully");
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      setImportOpen(false);
  
      e.target.value = ""; // reset input
    } catch (err: any) {
      toast.error(err.message);
      console.error(err);
    }
  };

  const create = useMutation({
    mutationFn: async (fd: FormData) => {
      const { error } = await supabase.from("courses").insert({
        name: fd.get("name") as string,
        code: fd.get("code") as string,
        program_id: fd.get("program_id") as string,
        year_level: fd.get("year_level") ? parseInt(fd.get("year_level") as string) : null,
        semester: fd.get("semester") as string || null,
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
        year_level: fd.get("year_level") ? parseInt(fd.get("year_level") as string) : null,
        semester: fd.get("semester") as string || null,
        credits: parseInt(fd.get("credits") as string) || 3,
        description: fd.get("description") as string || null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["courses"] }); setEditCourse(null); toast.success("Course updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const toRoman = (value: string | number | null | undefined) => {
    const num = Number(value);
    const map: Record<number, string> = {
      1: "I",
      2: "II",
      3: "III",
      4: "IV",
      5: "V",
      6: "VI",
      7: "VII",
      8: "VIII",
    };
    return map[num] || String(value || "");
  };

  // Group courses by program -> year/semester
  const filteredCourses = (courses || []).filter((c: any) =>
    programFilter === "all" || c.program_id === programFilter
  );

  const groupedByProgram = filteredCourses.reduce((acc: Record<string, Record<string, any[]>>, c: any) => {
    const program = c.programs?.name || "Unknown Program";
    const yearSemKey = `${c.year_level || "N/A"}|${c.semester || "N/A"}`;
    if (!acc[program]) acc[program] = {};
    if (!acc[program][yearSemKey]) acc[program][yearSemKey] = [];
    acc[program][yearSemKey].push(c);
    return acc;
  }, {} as Record<string, Record<string, any[]>>);

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between gap-3">
      <div className="flex gap-2">
  <Select value={programFilter} onValueChange={setProgramFilter}>
    <SelectTrigger className="w-[220px]">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Programs</SelectItem>
      {(programs || []).map((p: any) => (
        <SelectItem key={p.id} value={p.id}>
          {p.code} - {p.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>

  {/* EXPORT */}
  <Button
    size="sm"
    variant="outline"
    onClick={() => exportCoursesToCSV(filteredCourses)}
  >
    Export CSV
  </Button>

  <Dialog open={importOpen} onOpenChange={setImportOpen}>
    <DialogTrigger asChild>
      <Button size="sm" variant="outline">Import CSV</Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader><DialogTitle>Import Courses</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Download the template, fill it, then upload CSV. You can also upload grouped exports.
        </p>
        <Button size="sm" variant="outline" onClick={downloadCourseTemplate}>
          Download Template
        </Button>
        <div>
          <input
            type="file"
            accept=".csv"
            id="courseCsvInput"
            className="hidden"
            onChange={handleImport}
          />
          <Button
            size="sm"
            onClick={() => document.getElementById("courseCsvInput")?.click()}
          >
            Upload CSV
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</div>
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
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2"><Label>Year</Label><Input name="year_level" type="number" min="1" max="8" placeholder="e.g. 1" /></div>
                <div className="space-y-2"><Label>Semester</Label><Input name="semester" placeholder="e.g. 1 or I" /></div>
              </div>
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
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2"><Label>Year</Label><Input name="year_level" type="number" min="1" max="8" defaultValue={editCourse.year_level || ""} /></div>
                <div className="space-y-2"><Label>Semester</Label><Input name="semester" defaultValue={editCourse.semester || ""} /></div>
              </div>
              <div className="space-y-2"><Label>Credits</Label><Input name="credits" type="number" defaultValue={editCourse.credits} /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea name="description" defaultValue={editCourse.description || ""} rows={2} /></div>
              <Button type="submit" className="w-full" disabled={update.isPending}>Update Course</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : (
        <Accordion type="multiple" className="space-y-2">
          {Object.entries(groupedByProgram).map(([programName, yearSemesterGroups]) => (
            <AccordionItem key={programName} value={programName} className="rounded-lg border bg-card">
              <AccordionTrigger className="px-4 text-sm font-medium hover:no-underline">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  {programName}
                  <span className="text-xs text-muted-foreground">
                    ({Object.values(yearSemesterGroups).flat().length} courses)
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4">
                  {Object.entries(yearSemesterGroups)
                    .sort(([a], [b]) => {
                      const [aYear, aSem] = a.split("|");
                      const [bYear, bSem] = b.split("|");
                      const yearDiff = Number(aYear || 0) - Number(bYear || 0);
                      if (yearDiff !== 0) return yearDiff;
                      return String(aSem).localeCompare(String(bSem));
                    })
                    .map(([yearSemKey, yearSemCourses]) => {
                      const [year, sem] = yearSemKey.split("|");
                      return (
                        <div key={yearSemKey} className="rounded-md border">
                          <div className="border-b bg-muted/40 px-4 py-2 text-sm font-semibold">
                            Year {toRoman(year)} , Semester {toRoman(sem)}
                          </div>
                          <div className="grid grid-cols-[200px_1fr_80px_60px] border-b bg-muted/20 px-4 py-2 text-xs font-semibold">
                            <div>Course Code</div>
                            <div>Course Title</div>
                            <div>Cr. Hr</div>
                            <div />
                          </div>
                          <div>
                            {(yearSemCourses as any[]).map((c: any) => (
                              <div key={c.id} className="grid grid-cols-[200px_1fr_80px_60px] items-center border-b px-4 py-2 last:border-b-0">
                                <div className="font-medium">{c.code}</div>
                                <div>{c.name}</div>
                                <div>{c.credits}</div>
                                <div className="flex justify-end">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditCourse(c)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
