import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { action, weeklyReportId, note } = await req.json();
    if (!action || !weeklyReportId) {
      return new Response(JSON.stringify({ error: "action and weeklyReportId are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleRows } = await adminClient
      .from("user_roles")
      .select("roles(name)")
      .eq("user_id", caller.id);
    const roles = (roleRows || []).map((r: any) => r.roles?.name).filter(Boolean);
    const isCollegeAdmin = roles.includes("college_admin") || roles.includes("super_admin");
    const isDepartmentHead = roles.includes("department_head");

    const { data: weeklyReport, error: weeklyError } = await adminClient
      .from("weekly_department_reports")
      .select("id, department_id, status")
      .eq("id", weeklyReportId)
      .maybeSingle();
    if (weeklyError) throw weeklyError;
    if (!weeklyReport) {
      return new Response(JSON.stringify({ error: "Weekly report not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "submit") {
      if (!isDepartmentHead && !isCollegeAdmin) {
        return new Response(JSON.stringify({ error: "Only department heads can submit weekly reports" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: submitError } = await adminClient
        .from("weekly_department_reports")
        .update({
          status: "submitted",
          submitted_at: new Date().toISOString(),
          submitted_by: caller.id,
          approval_note: note || null,
        })
        .eq("id", weeklyReportId);
      if (submitError) throw submitError;

      // Notify college admins for approval
      const { data: collegeAdmins } = await adminClient
        .from("user_roles")
        .select("user_id, roles(name)")
        .in("roles.name", ["college_admin", "super_admin"]);
      const recipientIds = Array.from(new Set((collegeAdmins || []).map((u: any) => u.user_id))).filter(Boolean);
      if (recipientIds.length > 0) {
        await adminClient.from("notifications").insert(
          recipientIds.map((userId) => ({
            user_id: userId,
            title: "Weekly Report Awaiting Approval",
            message: "A department weekly report has been submitted for review.",
            type: "info",
            related_id: weeklyReportId,
            related_table: "weekly_department_reports",
          }))
        );
      }

      return new Response(JSON.stringify({ success: true, status: "submitted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "approve" || action === "reject") {
      if (!isCollegeAdmin) {
        return new Response(JSON.stringify({ error: "Only college admins can approve or reject weekly reports" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const nextStatus = action === "approve" ? "approved" : "rejected";
      const { error: updateError } = await adminClient
        .from("weekly_department_reports")
        .update({
          status: nextStatus,
          approved_at: new Date().toISOString(),
          approved_by: caller.id,
          approval_note: note || null,
        })
        .eq("id", weeklyReportId);
      if (updateError) throw updateError;

      return new Response(JSON.stringify({ success: true, status: nextStatus }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unsupported action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

