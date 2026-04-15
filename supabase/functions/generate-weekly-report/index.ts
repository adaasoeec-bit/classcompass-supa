import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ReportRow = {
  id: string;
  status: string;
  students_present: number | null;
  students_absent: number | null;
  students_total: number | null;
  instructor_attended: boolean | null;
};

function getCurrentWeekRange() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(now);
  start.setDate(now.getDate() + mondayOffset);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return {
    weekStart: start.toISOString().slice(0, 10),
    weekEnd: end.toISOString().slice(0, 10),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("PROJECT_URL")!;
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY")!;
    const publishableKey = Deno.env.get("ANON_KEY")!;

    const callerClient = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdminResult } = await adminClient.rpc("is_admin", { _user_id: caller.id });
    const { data: roleRows } = await adminClient
      .from("user_roles")
      .select("roles(name)")
      .eq("user_id", caller.id);
    const roleNames = (roleRows || []).map((r: any) => r.roles?.name).filter(Boolean);
    const isDepartmentHead = roleNames.includes("department_head");

    if (!isAdminResult && !isDepartmentHead) {
      return new Response(JSON.stringify({ error: "Only admins and department heads can generate weekly reports" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const defaults = getCurrentWeekRange();
    const weekStart: string = body.weekStart || defaults.weekStart;
    const weekEnd: string = body.weekEnd || defaults.weekEnd;
    const sendNow: boolean = body.sendNow ?? false;

    let departmentIds: string[] = [];
    if (body.departmentId) {
      departmentIds = [body.departmentId as string];
    } else if (isAdminResult) {
      const { data: allDepartments, error: depErr } = await adminClient.from("departments").select("id").eq("is_active", true);
      if (depErr) throw depErr;
      departmentIds = (allDepartments || []).map((d: any) => d.id);
    } else {
      const { data: myDepartments, error: myDepErr } = await adminClient
        .from("user_departments")
        .select("department_id")
        .eq("user_id", caller.id);
      if (myDepErr) throw myDepErr;
      departmentIds = (myDepartments || []).map((d: any) => d.department_id);
    }

    if (!departmentIds.length) {
      return new Response(JSON.stringify({ error: "No departments found for weekly report generation" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const generated: any[] = [];

    for (const departmentId of departmentIds) {
      const { data: reportRows, error: reportsError } = await adminClient
        .from("class_reports")
        .select("id,status,students_present,students_absent,students_total,instructor_attended")
        .eq("department_id", departmentId)
        .gte("report_date", weekStart)
        .lte("report_date", weekEnd);

      if (reportsError) throw reportsError;

      const rows = (reportRows || []) as ReportRow[];
      const totalReports = rows.length;
      const submittedReports = rows.filter((r) => r.status === "submitted").length;
      const approvedReports = rows.filter((r) => r.status === "approved" || r.status === "dept_head_approved").length;
      const rejectedReports = rows.filter((r) => r.status === "rejected").length;
      const absentInstructorReports = rows.filter((r) => r.instructor_attended === false).length;
      const studentsPresentTotal = rows.reduce((sum, r) => sum + (r.students_present || 0), 0);
      const studentsAbsentTotal = rows.reduce((sum, r) => sum + (r.students_absent || 0), 0);
      const studentsTotalTotal = rows.reduce((sum, r) => sum + (r.students_total || 0), 0);
      const attendanceRate = studentsTotalTotal > 0 ? Number(((studentsPresentTotal / studentsTotalTotal) * 100).toFixed(2)) : 0;

      const summary = {
        totalReports,
        submittedReports,
        approvedReports,
        rejectedReports,
        absentInstructorReports,
        studentsPresentTotal,
        studentsAbsentTotal,
        studentsTotalTotal,
        attendanceRate,
      };

      const { data: upserted, error: upsertError } = await adminClient
        .from("weekly_department_reports")
        .upsert({
          department_id: departmentId,
          week_start: weekStart,
          week_end: weekEnd,
          generated_by: caller.id,
          total_reports: totalReports,
          submitted_reports: submittedReports,
          approved_reports: approvedReports,
          rejected_reports: rejectedReports,
          absent_instructor_reports: absentInstructorReports,
          students_present_total: studentsPresentTotal,
          students_absent_total: studentsAbsentTotal,
          students_total_total: studentsTotalTotal,
          attendance_rate: attendanceRate,
          status: "draft",
          summary,
        }, { onConflict: "department_id,week_start,week_end" })
        .select("id")
        .single();

      if (upsertError) throw upsertError;

      let recipientCount = 0;
      if (sendNow) {
        const { data: recipientRows } = await adminClient
          .from("user_departments")
          .select("user_id")
          .eq("department_id", departmentId);
        const uniqueRecipients = Array.from(new Set((recipientRows || []).map((r: any) => r.user_id))).filter(Boolean);
        recipientCount = uniqueRecipients.length;
        if (uniqueRecipients.length > 0) {
          await adminClient.from("notifications").insert(
            uniqueRecipients.map((userId) => ({
              user_id: userId,
              title: "Weekly Department Report",
              message: `Weekly report (${weekStart} to ${weekEnd}) generated. Attendance rate: ${attendanceRate}%`,
              type: "info",
              related_id: upserted.id,
              related_table: "weekly_department_reports",
            }))
          );
        }
      }

      await adminClient.from("weekly_report_dispatch_logs").insert({
        weekly_report_id: upserted.id,
        channel: "in_app",
        recipient_count: recipientCount,
        sent_by: caller.id,
        result: sendNow ? "sent" : "draft_created",
      });

      generated.push({
        weeklyReportId: upserted.id,
        departmentId,
        ...summary,
        sent: sendNow,
        recipientCount,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      weekStart,
      weekEnd,
      generatedCount: generated.length,
      generated,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

