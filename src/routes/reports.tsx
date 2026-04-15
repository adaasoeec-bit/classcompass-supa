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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FileText, Search, Filter, Download, AlertTriangle, Trash2 } from "lucide-react";
import { exportToPDF, exportToExcel, exportWeeklyToPDF, exportWeeklyToExcel } from "@/lib/export-utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { canCreateReports, canViewReports, isAdmin, hasRole } from "@/lib/auth";
import { toast } from "sonner";

const EDGE_API_KEY =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  if (!user || !canViewReports(user)) return <AppLayout><div className="py-12 text-center text-muted-foreground">You don't have permission to view this page.</div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Class Reports</h1>
            <p className="text-sm text-muted-foreground">Submit and manage daily class reports</p>
          </div>
          <div className="flex items-center gap-2">
            {(isAdmin(user) || hasRole(user, "department_head")) && <WeeklyReportDialog />}
            {canCreateReports(user) && <NewReportDialog />}
          </div>
        </div>
        <Tabs defaultValue="daily" className="space-y-4">
          <TabsList>
            <TabsTrigger value="daily">Daily Reports</TabsTrigger>
            <TabsTrigger value="weekly">Weekly Reports</TabsTrigger>
          </TabsList>
          <TabsContent value="daily">
            <ReportsList />
          </TabsContent>
          <TabsContent value="weekly">
            <WeeklyReportsList />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function WeeklyReportDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [weekStart, setWeekStart] = useState("");

  const generateWeeklyReport = useMutation({
    mutationFn: async () => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("You must be logged in to generate weekly reports.");
      if (!EDGE_API_KEY) throw new Error("Missing VITE_SUPABASE_PUBLISHABLE_KEY in .env");

      const body: Record<string, any> = { sendNow: false };
      if (weekStart) body.weekStart = weekStart;

      const response = await supabase.functions.invoke("generate-weekly-report", {
        headers: { Authorization: `Bearer ${accessToken}`, apikey: EDGE_API_KEY },
        body,
      });

      if (response.error) {
        const msg = response.data?.error || response.error.message || "Failed to generate weekly report";
        throw new Error(msg);
      }
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: (data: any) => {
      setOpen(false);
      const count = data?.generatedCount ?? 0;
      queryClient.invalidateQueries({ queryKey: ["weekly-reports"] });
      toast.success(`Weekly draft generated for ${count} department(s).`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Generate Weekly Report</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Weekly Report</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Week Start (optional)</Label>
            <Input
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to use current week (Mon-Sun).
            </p>
          </div>
          <Button
            className="w-full"
            onClick={() => generateWeeklyReport.mutate()}
            disabled={generateWeeklyReport.isPending}
          >
            {generateWeeklyReport.isPending ? "Generating..." : "Generate & Send"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WeeklyReportsList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [weeklyCollegeFilter, setWeeklyCollegeFilter] = useState<string>("all");
  const [weeklyDepartmentFilter, setWeeklyDepartmentFilter] = useState<string>("all");
  const [collegeStartDate, setCollegeStartDate] = useState("");
  const [collegeEndDate, setCollegeEndDate] = useState("");

  const { data: weeklyReports, isLoading } = useQuery({
    queryKey: ["weekly-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_department_reports")
        .select("*, departments(name, code, college_id)")
        .order("week_start", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: weeklyFilterDepartments } = useQuery({
    queryKey: ["weekly-filter-departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name, code, college_id, colleges(name, code)")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const filtered = (weeklyReports || []).filter((r: any) =>
    (
      r.departments?.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.departments?.code?.toLowerCase().includes(search.toLowerCase())
    ) &&
    (weeklyCollegeFilter === "all" || r.departments?.college_id === weeklyCollegeFilter) &&
    (weeklyDepartmentFilter === "all" || r.department_id === weeklyDepartmentFilter)
  );

  const weeklyColleges = Array.from(
    new Map(
      (weeklyFilterDepartments || [])
        .filter((d: any) => d.colleges)
        .map((d: any) => [d.college_id, { id: d.college_id, code: d.colleges.code, name: d.colleges.name }])
    ).values()
  );

  const weeklyDepartments = Array.from(
    new Map(
      (weeklyReports || [])
        .filter((r: any) => r.departments)
        .filter((r: any) => weeklyCollegeFilter === "all" ? true : r.departments.college_id === weeklyCollegeFilter)
        .map((r: any) => [r.department_id, { id: r.department_id, code: r.departments.code, name: r.departments.name }])
    ).values()
  );

  const manageWeeklyReport = useMutation({
    mutationFn: async ({ action, weeklyReportId }: { action: "submit" | "approve" | "reject"; weeklyReportId: string }) => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("You must be logged in.");
      if (!EDGE_API_KEY) throw new Error("Missing VITE_SUPABASE_PUBLISHABLE_KEY in .env");

      const response = await supabase.functions.invoke("manage-weekly-report", {
        headers: { Authorization: `Bearer ${accessToken}`, apikey: EDGE_API_KEY },
        body: { action, weeklyReportId },
      });
      if (response.error) {
        const msg = response.data?.error || response.error.message || "Failed to update weekly report";
        throw new Error(msg);
      }
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: (_data, vars) => {
      toast.success(
        vars.action === "submit"
          ? "Weekly report submitted to college admin."
          : vars.action === "approve"
            ? "Weekly report approved."
            : "Weekly report rejected."
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly-reports"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteWeeklyReport = useMutation({
    mutationFn: async (weeklyReportId: string) => {
      const canDelete = hasRole(user, "super_admin") || hasRole(user, "college_admin");
      if (!canDelete) throw new Error("You do not have permission to delete weekly reports.");

      const { error } = await supabase
        .from("weekly_department_reports")
        .delete()
        .eq("id", weeklyReportId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Weekly report deleted.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly-reports"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const exportableWeekly = filtered.filter((r: any) => r.status === "submitted" || r.status === "approved");

  const generateCollegeWeeklyReport = useMutation({
    mutationFn: async () => {
      if (!collegeStartDate || !collegeEndDate) {
        throw new Error("Start date and end date are required.");
      }
      if (collegeStartDate > collegeEndDate) {
        throw new Error("Start date must be before or equal to end date.");
      }

      const { data, error } = await supabase
        .from("weekly_department_reports")
        .select("*, departments(name, code)")
        .in("status", ["submitted", "approved"])
        .gte("week_start", collegeStartDate)
        .lte("week_end", collegeEndDate)
        .order("week_start", { ascending: true });

      if (error) throw error;
      const rows = data || [];
      if (rows.length === 0) {
        throw new Error("No submitted/approved department weekly reports found in the selected range.");
      }

      const title = `College Weekly Report ${collegeStartDate} to ${collegeEndDate}`;
      exportWeeklyToPDF(rows as any[], title);
      exportWeeklyToExcel(rows as any[], title);
      return rows.length;
    },
    onSuccess: (count) => {
      toast.success(`Generated college weekly report from ${count} department weekly report(s).`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder="Search weekly reports by department..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Select value={weeklyCollegeFilter} onValueChange={(v) => { setWeeklyCollegeFilter(v); setWeeklyDepartmentFilter("all"); }}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by college" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Colleges</SelectItem>
            {weeklyColleges.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={weeklyDepartmentFilter} onValueChange={setWeeklyDepartmentFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {weeklyDepartments.map((d: any) => (
              <SelectItem key={d.id} value={d.id}>{d.code} - {d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {(hasRole(user, "college_admin") || hasRole(user, "management") || hasRole(user, "ad_dean")) && (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <Input
              type="date"
              value={collegeStartDate}
              onChange={(e) => setCollegeStartDate(e.target.value)}
              placeholder="Start date"
            />
            <Input
              type="date"
              value={collegeEndDate}
              onChange={(e) => setCollegeEndDate(e.target.value)}
              placeholder="End date"
            />
            {hasRole(user, "college_admin") && (
              <Button
                size="sm"
                onClick={() => generateCollegeWeeklyReport.mutate()}
                disabled={generateCollegeWeeklyReport.isPending}
              >
                {generateCollegeWeeklyReport.isPending ? "Generating..." : "Generate College Weekly Report (PDF+Excel)"}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportWeeklyToPDF(exportableWeekly)} disabled={exportableWeekly.length === 0}>
            <Download className="mr-1 h-3.5 w-3.5" /> Weekly PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportWeeklyToExcel(exportableWeekly)} disabled={exportableWeekly.length === 0}>
            <Download className="mr-1 h-3.5 w-3.5" /> Weekly Excel
          </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading weekly reports...</div>
      ) : filtered.length === 0 ? (
        <Card className="stat-card-shadow">
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <FileText className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No weekly reports found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((report: any) => (
            <Card key={report.id} className="stat-card-shadow transition-shadow hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {report.departments?.code || "N/A"} - {report.departments?.name || "Unknown Department"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Start Date: {new Date(report.week_start).toLocaleDateString()} · End Date: {new Date(report.week_end).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Generated: {new Date(report.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="outline">{report.attendance_rate}% attendance</Badge>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                  <p>Total Reports: {report.total_reports}</p>
                  <p>Submitted: {report.submitted_reports}</p>
                  <p>Approved: {report.approved_reports}</p>
                  <p>Rejected: {report.rejected_reports}</p>
                  <p>Instructor Absent: {report.absent_instructor_reports}</p>
                  <p>Students Present/Total: {report.students_present_total}/{report.students_total_total}</p>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Badge variant={report.status === "approved" ? "default" : report.status === "submitted" ? "secondary" : report.status === "rejected" ? "destructive" : "outline"}>
                    {report.status}
                  </Badge>
                  {hasRole(user, "department_head") && report.status === "draft" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => manageWeeklyReport.mutate({ action: "submit", weeklyReportId: report.id })}
                      disabled={manageWeeklyReport.isPending}
                    >
                      Submit to College Admin
                    </Button>
                  )}
                  {hasRole(user, "college_admin") && report.status === "submitted" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => manageWeeklyReport.mutate({ action: "approve", weeklyReportId: report.id })}
                        disabled={manageWeeklyReport.isPending}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => manageWeeklyReport.mutate({ action: "reject", weeklyReportId: report.id })}
                        disabled={manageWeeklyReport.isPending}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  {(hasRole(user, "super_admin") || hasRole(user, "college_admin")) && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        const ok = window.confirm("Delete this generated weekly report? This action cannot be undone.");
                        if (ok) deleteWeeklyReport.mutate(report.id);
                      }}
                      disabled={deleteWeeklyReport.isPending}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Delete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function NewReportDialog() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [instructorAttended, setInstructorAttended] = useState(true);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [selectedInstructorId, setSelectedInstructorId] = useState("");
  const [instructorSearch, setInstructorSearch] = useState("");
  const [customInstructorName, setCustomInstructorName] = useState("");

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

  const { data: instructors } = useQuery({
    queryKey: ["university-instructors-for-reports", selectedDepartmentId],
    queryFn: async () => {
      let query = supabase
        .from("university_instructors")
        .select("id, full_name, department_id, college_id, is_active")
        .eq("is_active", true)
        .order("full_name");
      if (selectedDepartmentId) {
        query = query.eq("department_id", selectedDepartmentId);
      }
      const { data } = await query;
      return data || [];
    },
    enabled: !!user,
  });

  const createReport = useMutation({
    mutationFn: async (formData: FormData) => {
      if (!selectedDepartmentId) throw new Error("Department is required");
      if (!selectedInstructorId) throw new Error("Instructor selection is required");
      if (selectedInstructorId === "__other__" && !customInstructorName.trim()) {
        throw new Error("Please enter instructor name");
      }
      const semester = (formData.get("semester") as string) || "";
      const classYear = (formData.get("academic_year") as string) || "";
      const academicYearValue = [semester, classYear].filter(Boolean).join(" - ") || null;
      const selectedInstructorName =
        selectedInstructorId === "__other__"
          ? customInstructorName.trim()
          : (instructors || []).find((i: any) => i.id === selectedInstructorId)?.full_name || "";
      const studentsPresent = parseInt(formData.get("students_present") as string) || 0;
      const studentsAbsent = parseInt(formData.get("students_absent") as string) || 0;
      const studentsTotal = studentsPresent + studentsAbsent;

      const { error } = await supabase.from("class_reports").insert({
        department_id: selectedDepartmentId || (formData.get("department_id") as string),
        course_id: formData.get("course_id") as string || null,
        instructor_id: null,
        instructor_name: selectedInstructorName,
        instructor_attended: instructorAttended,
        report_date: formData.get("report_date") as string,
        academic_year: academicYearValue,
        section_name: formData.get("section_name") as string || null,
        class_hour: formData.get("class_hour") as string || null,
        class_building: formData.get("class_building") as string || null,
        room_number: formData.get("room_number") as string || null,
        // Keep compatibility with DB schema where topic_covered is required.
        topic_covered: "Not specified",
        teaching_method: (formData.get("teaching_method") as any) || "lecture",
        students_present: studentsPresent,
        students_absent: studentsAbsent,
        students_total: studentsTotal,
        issues: null,
        remarks: null,
        status: (formData.get("status") as any) || "draft",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setOpen(false);
      setInstructorAttended(true);
      setInstructorSearch("");
      setSelectedInstructorId("");
      setCustomInstructorName("");
      toast.success("Report created successfully");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filteredInstructors = (instructors || []).filter((ins: any) =>
    ins.full_name?.toLowerCase().includes(instructorSearch.toLowerCase())
  );

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
              <Select
                name="department_id"
                value={selectedDepartmentId}
                onValueChange={(value) => {
                  setSelectedDepartmentId(value);
                  setSelectedInstructorId("");
                  setInstructorSearch("");
                  setCustomInstructorName("");
                }}
                required
              >
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

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input name="report_date" type="date" defaultValue={new Date().toISOString().split("T")[0]} required />
            </div>
            <div className="space-y-2">
              <Label>Semester</Label>
              <Select name="semester" required>
                <SelectTrigger><SelectValue placeholder="Select semester" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="First Semester">First Semester</SelectItem>
                  <SelectItem value="Second Semester">Second Semester</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Class Year</Label>
              <Select name="academic_year" required>
                <SelectTrigger><SelectValue placeholder="Select class year" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="First Year">First Year</SelectItem>
                  <SelectItem value="Second Year">Second Year</SelectItem>
                  <SelectItem value="Third Year">Third Year</SelectItem>
                  <SelectItem value="Fourth Year">Fourth Year</SelectItem>
                  <SelectItem value="Fifth Year">Fifth Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Section</Label>
              <Input name="section_name" placeholder="e.g. Section A" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <Label>Class Hour</Label>
              <Input name="class_hour" placeholder="e.g. 8:00 - 9:00 AM" />
            </div>
            <div className="space-y-2">
              <Label>Class Building</Label>
              <Input name="class_building" placeholder="e.g. Block A" />
            </div>
            <div className="space-y-2">
              <Label>Room Number</Label>
              <Input name="room_number" placeholder="e.g. 205" />
            </div>
            <div className="space-y-2">
              <Label>Instructor Name</Label>
              <Select value={selectedInstructorId} onValueChange={(value) => {
                setSelectedInstructorId(value);
                if (value !== "__other__") setCustomInstructorName("");
              }} required>
                <SelectTrigger><SelectValue placeholder="Select instructor" /></SelectTrigger>
                <SelectContent>
                  <div className="sticky top-0 z-10 bg-popover p-2">
                    <Input
                      placeholder="Type instructor name..."
                      value={instructorSearch}
                      onChange={(e) => setInstructorSearch(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                  </div>
                  {filteredInstructors.map((ins: any) => (
                    <SelectItem key={ins.id} value={ins.id}>{ins.full_name}</SelectItem>
                  ))}
                  <SelectItem value="__other__">Other (Type name manually)</SelectItem>
                  {filteredInstructors.length === 0 && (
                    <div className="px-2 py-2 text-xs text-muted-foreground">No instructors found</div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          {selectedInstructorId === "__other__" && (
            <div className="space-y-2">
              <Label>Instructor Name (Other)</Label>
              <Input
                value={customInstructorName}
                onChange={(e) => setCustomInstructorName(e.target.value)}
                placeholder="Enter instructor full name"
                required
              />
            </div>
          )}

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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Students Present</Label>
              <Input name="students_present" type="number" min="0" defaultValue="0" />
            </div>
            <div className="space-y-2">
              <Label>Students Absent</Label>
              <Input name="students_absent" type="number" min="0" defaultValue="0" />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="submit" name="status" value="draft">Save as Draft</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReportsList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [collegeFilter, setCollegeFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");

  const { data: filterDepartments } = useQuery({
    queryKey: ["report-filter-departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name, code, college_id, colleges(name, code)")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: reports, isLoading } = useQuery({
    queryKey: ["reports", user?.id, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("class_reports")
        .select("*, departments(name, code, college_id), courses(name, code)")
        .order("report_date", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as any);
      }

      const { data } = await query;
      return data || [];
    },
    enabled: !!user,
  });

  const submitReport = useMutation({
    mutationFn: async (reportId: string) => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("You must be logged in to submit reports.");
      if (!EDGE_API_KEY) throw new Error("Missing VITE_SUPABASE_PUBLISHABLE_KEY in .env");

      const response = await supabase.functions.invoke("submit-report", {
        headers: { Authorization: `Bearer ${accessToken}`, apikey: EDGE_API_KEY },
        body: { reportId },
      });

      if (response.error) {
        const message = response.data?.error || response.error.message || "Failed to submit report";
        throw new Error(message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Report submitted for approval");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = (reports || []).filter((r: any) =>
    (
      r.section_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.instructor_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.courses?.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.courses?.code?.toLowerCase().includes(search.toLowerCase())
    ) &&
    (collegeFilter === "all" || r.departments?.college_id === collegeFilter) &&
    (departmentFilter === "all" || r.department_id === departmentFilter)
  );

  const visibleColleges = Array.from(
    new Map(
      (filterDepartments || [])
        .filter((d: any) => d.colleges)
        .map((d: any) => [d.college_id, { id: d.college_id, code: d.colleges.code, name: d.colleges.name }])
    ).values()
  );

  const visibleDepartments = (filterDepartments || []).filter((d: any) =>
    collegeFilter === "all" ? true : d.college_id === collegeFilter
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
        <Select value={collegeFilter} onValueChange={(v) => { setCollegeFilter(v); setDepartmentFilter("all"); }}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="College" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Colleges</SelectItem>
            {visibleColleges.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {visibleDepartments.map((d: any) => (
              <SelectItem key={d.id} value={d.id}>{d.code} - {d.name}</SelectItem>
            ))}
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
                {report.instructor_attended === false ? (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">
                      {report.courses?.name || report.section_name || "Class Report"}
                    </p>
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
                  <p className="text-xs text-muted-foreground">
                    {report.class_building && `Building: ${report.class_building}`} {report.room_number && `· Room: ${report.room_number}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden text-right text-xs text-muted-foreground sm:block">
                    <p>Present: {report.students_present}/{report.students_total}</p>
                    <p className="capitalize">{report.teaching_method}</p>
                  </div>
                  {canCreateReports(user) && (report.status === "draft" || report.status === "rejected") && (
                    <Button
                      size="sm"
                      onClick={() => submitReport.mutate(report.id)}
                      disabled={submitReport.isPending}
                    >
                      Submit
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
