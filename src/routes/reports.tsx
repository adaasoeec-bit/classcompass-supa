import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, FileText, Search, Filter, Download, AlertTriangle } from "lucide-react";
import { exportToPDF, exportToExcel } from "@/lib/export-utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { canCreateReports, isAdmin, hasRole } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  if (!user || !canCreateReports(user)) return <AppLayout><div className="py-12 text-center text-muted-foreground">You don't have permission to view this page.</div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Class Reports</h1>
            <p className="text-sm text-muted-foreground">Submit and manage daily class reports</p>
          </div>
          <NewReportDialog />
        </div>
        <ReportsList />
      </div>
    </AppLayout>
  );
}

function NewReportDialog() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [instructorAttended, setInstructorAttended] = useState(true);

  const { data: departments } = useQuery({
    queryKey: ["my-departments", user?.id],
    queryFn: async () => {
      if (isAdmin(user)) {
        const { data } = await supabase.from("departments").select("id, name, code");
        return data || [];
      }
      const { data } = await supabase
        .from("user_departments")
        .select("department_id, departments(id, name, code)")
        .eq("user_id", user!.id);
      return (data || []).map((d: any) => d.departments).filter(Boolean);
    },
    enabled: !!user,
  });

  const { data: courses } = useQuery({
    queryKey: ["all-courses-for-reports"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, name, code, programs(name, departments(id))")
        .order("name");
      return data || [];
    },
    enabled: !!user,
  });

  const { data: profiles } = useQuery({
    queryKey: ["all-profiles-for-reports"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name").order("full_name");
      return data || [];
    },
    enabled: !!user,
  });

  const createReport = useMutation({
    mutationFn: async (formData: FormData) => {
      const { error } = await supabase.from("class_reports").insert({
        department_id: formData.get("department_id") as string,
        course_id: formData.get("course_id") as string || null,
        instructor_id: user!.id,
        instructor_name: formData.get("instructor_name") as string,
        instructor_attended: instructorAttended,
        report_date: formData.get("report_date") as string,
        academic_year: formData.get("academic_year") as string || null,
        section_name: formData.get("section_name") as string || null,
        class_hour: formData.get("class_hour") as string || null,
        topic_covered: formData.get("topic_covered") as string,
        teaching_method: (formData.get("teaching_method") as any) || "lecture",
        students_present: parseInt(formData.get("students_present") as string) || 0,
        students_absent: parseInt(formData.get("students_absent") as string) || 0,
        students_total: parseInt(formData.get("students_total") as string) || 0,
        issues: formData.get("issues") as string || null,
        remarks: formData.get("remarks") as string || null,
        status: (formData.get("status") as any) || "draft",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setOpen(false);
      setInstructorAttended(true);
      toast.success("Report created successfully");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" /> New Report</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Submit Class Report</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); createReport.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Department</Label>
              <Select name="department_id" required>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {(departments || []).map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{d.code} - {d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Course</Label>
              <Select name="course_id">
                <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                <SelectContent>
                  {(courses || []).map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input name="report_date" type="date" defaultValue={new Date().toISOString().split("T")[0]} required />
            </div>
            <div className="space-y-2">
              <Label>Academic Year</Label>
              <Input name="academic_year" placeholder="e.g. 2025/26" />
            </div>
            <div className="space-y-2">
              <Label>Section</Label>
              <Input name="section_name" placeholder="e.g. Section A" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Class Hour</Label>
              <Input name="class_hour" placeholder="e.g. 8:00 - 9:00 AM" />
            </div>
            <div className="space-y-2">
              <Label>Instructor Name</Label>
              <Input name="instructor_name" placeholder="Instructor full name" required list="instructor-names" />
              <datalist id="instructor-names">
                {(profiles || []).map((p: any, i: number) => (
                  <option key={i} value={p.full_name} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Switch checked={instructorAttended} onCheckedChange={setInstructorAttended} />
            <div className="flex-1">
              <Label className="text-sm font-medium">Instructor Attended</Label>
              <p className="text-xs text-muted-foreground">Toggle off if instructor missed the class</p>
            </div>
            {!instructorAttended && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Absent
              </Badge>
            )}
          </div>

          <div className="space-y-2">
            <Label>Topic Covered</Label>
            <Input name="topic_covered" placeholder="Enter the topic covered in class" required />
          </div>

          <div className="space-y-2">
            <Label>Teaching Method</Label>
            <Select name="teaching_method" defaultValue="lecture">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["lecture", "lab", "seminar", "workshop", "online", "hybrid", "tutorial", "other"].map(m => (
                  <SelectItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Students Present</Label>
              <Input name="students_present" type="number" min="0" defaultValue="0" />
            </div>
            <div className="space-y-2">
              <Label>Students Absent</Label>
              <Input name="students_absent" type="number" min="0" defaultValue="0" />
            </div>
            <div className="space-y-2">
              <Label>Total Students</Label>
              <Input name="students_total" type="number" min="0" defaultValue="0" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Issues / Challenges</Label>
            <Textarea name="issues" placeholder="Any issues faced during class" rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Remarks</Label>
            <Textarea name="remarks" placeholder="Additional remarks" rows={2} />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="submit" name="status" value="draft" variant="outline">Save as Draft</Button>
            <Button type="submit" name="status" value="submitted">Submit for Approval</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReportsList() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: reports, isLoading } = useQuery({
    queryKey: ["reports", user?.id, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("class_reports")
        .select("*, departments(name, code), courses(name, code)")
        .order("report_date", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as any);
      }

      const { data } = await query;
      return data || [];
    },
    enabled: !!user,
  });

  const filtered = (reports || []).filter((r: any) =>
    r.topic_covered?.toLowerCase().includes(search.toLowerCase()) ||
    r.instructor_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.courses?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor: Record<string, string> = {
    draft: "secondary",
    submitted: "default",
    dept_head_approved: "default",
    approved: "default",
    rejected: "destructive",
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-10" placeholder="Search reports..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" /><SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="dept_head_approved">Dept Head Approved</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportToPDF(filtered)} disabled={filtered.length === 0}>
            <Download className="mr-1 h-3.5 w-3.5" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportToExcel(filtered)} disabled={filtered.length === 0}>
            <Download className="mr-1 h-3.5 w-3.5" /> Excel
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading reports...</div>
      ) : filtered.length === 0 ? (
        <Card className="stat-card-shadow">
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <FileText className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No reports found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((report: any) => (
            <Card key={report.id} className="stat-card-shadow transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-4">
                {report.instructor_attended === false && (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                )}
                {report.instructor_attended !== false && (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{report.topic_covered}</p>
                    <Badge variant={statusColor[report.status] as any} className="shrink-0 text-[10px]">
                      {report.status === "dept_head_approved" ? "Dept Approved" : report.status}
                    </Badge>
                    {report.instructor_attended === false && (
                      <Badge variant="destructive" className="shrink-0 text-[10px] flex items-center gap-0.5">
                        <AlertTriangle className="h-2.5 w-2.5" /> Instructor Absent
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {report.courses?.code || "N/A"} · {report.departments?.name || "N/A"} · {report.instructor_name || "N/A"} · {new Date(report.report_date).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {report.academic_year && `Year: ${report.academic_year}`} {report.section_name && `· ${report.section_name}`} {report.class_hour && `· ${report.class_hour}`}
                  </p>
                </div>
                <div className="hidden text-right text-xs text-muted-foreground sm:block">
                  <p>Present: {report.students_present}/{report.students_total}</p>
                  <p className="capitalize">{report.teaching_method}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
