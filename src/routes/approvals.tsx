import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { canApproveReports, isAdmin, hasRole } from "@/lib/auth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, FileText, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/approvals")({
  component: ApprovalsPage,
});

function ApprovalsPage() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  if (!user || !canApproveReports(user)) return <AppLayout><div className="py-12 text-center text-muted-foreground">You don't have permission to view this page.</div></AppLayout>;

  const isDeptHead = hasRole(user, "department_head");
  const isCollegeAdmin = hasRole(user, "college_admin") || hasRole(user, "super_admin");

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Approvals</h1>
          <p className="text-sm text-muted-foreground">
            {isDeptHead && "Review submitted reports and approve for college-level review"}
            {isCollegeAdmin && !isDeptHead && "Review department-approved reports for final approval"}
            {isDeptHead && isCollegeAdmin && " / Final approval for department-approved reports"}
          </p>
        </div>
        {isDeptHead && (
          <div>
            <h2 className="mb-3 text-lg font-semibold">Pending Department Approval</h2>
            <ApprovalsList statusFilter="submitted" approvalAction="dept_head_approved" />
          </div>
        )}
        {isCollegeAdmin && (
          <div>
            <h2 className="mb-3 text-lg font-semibold">Pending College Approval</h2>
            <ApprovalsList statusFilter="dept_head_approved" approvalAction="approved" />
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function ApprovalsList({ statusFilter, approvalAction }: { statusFilter: string; approvalAction: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: reports, isLoading } = useQuery({
    queryKey: ["pending-approvals", statusFilter],
    queryFn: async () => {
      const { data } = await supabase
        .from("class_reports")
        .select("*, departments(name, code), courses(name, code)")
        .eq("status", statusFilter as any)
        .order("submitted_at", { ascending: true });
      return data || [];
    },
    enabled: !!user,
  });



  const reviewReport = useMutation({
    mutationFn: async ({ reportId, status, comments }: { reportId: string; status: string; comments: string }) => {
      const { error: approvalError } = await supabase.from("report_approvals").insert({
        report_id: reportId,
        reviewer_id: user!.id,
        status: (status === "rejected" ? "rejected" : "approved") as any,
        comments: comments || null,
        reviewed_at: new Date().toISOString(),
      });
      if (approvalError) throw approvalError;

      const { error: updateError } = await supabase
        .from("class_reports")
        .update({ status: status as any })
        .eq("id", reportId);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Report reviewed successfully");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Loading...</div>;

  if (!reports?.length) {
    return (
      <Card className="stat-card-shadow">
        <CardContent className="flex flex-col items-center gap-3 py-8">
          <CheckCircle2 className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No pending approvals</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {reports.map((report: any) => (
        <ApprovalCard
          key={report.id}
          report={report}
          approvalAction={approvalAction}
          onReview={reviewReport.mutate}
          isPending={reviewReport.isPending}
        />
      ))}
    </div>
  );
}

function ApprovalCard({ report, approvalAction, onReview, isPending }: {
  report: any; approvalAction: string; onReview: any; isPending: boolean;
}) {
  const [comments, setComments] = useState("");
  const instructorAbsent = report.instructor_attended === false;

  return (
    <Card className={`stat-card-shadow ${instructorAbsent ? "border-destructive/50" : ""}`}>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${instructorAbsent ? "bg-destructive/10" : "bg-primary/10"}`}>
            {instructorAbsent ? <AlertTriangle className="h-5 w-5 text-destructive" /> : <FileText className="h-5 w-5 text-primary" />}
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{report.topic_covered}</p>
                  {instructorAbsent && (
                    <Badge variant="destructive" className="text-[10px] flex items-center gap-0.5">
                      <AlertTriangle className="h-2.5 w-2.5" /> Instructor Absent
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {report.courses?.code || "N/A"} · {report.departments?.name || "N/A"} · Instructor: {report.instructor_name || "N/A"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(report.report_date).toLocaleDateString()}
                  {report.academic_year && ` · Year: ${report.academic_year}`}
                  {report.section_name && ` · ${report.section_name}`}
                  {report.class_hour && ` · ${report.class_hour}`}
                  {` · ${report.students_present}/${report.students_total} present`}
                  {` · ${report.teaching_method}`}
                </p>
              </div>
              <Badge variant="secondary" className="text-[10px]">Pending</Badge>
            </div>

            {report.issues && (
              <p className="text-xs text-muted-foreground"><span className="font-medium">Issues:</span> {report.issues}</p>
            )}

            <div className="space-y-2">
              <Textarea
                placeholder="Add comments (optional)..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={2}
                className="text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => onReview({ reportId: report.id, status: approvalAction, comments })}
                  disabled={isPending}
                >
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  {approvalAction === "dept_head_approved" ? "Approve & Forward" : "Final Approve"}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onReview({ reportId: report.id, status: "rejected", comments })}
                  disabled={isPending}
                >
                  <XCircle className="mr-1.5 h-3.5 w-3.5" /> Reject
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
