import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;

    const callerClient = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: isAdminResult } = await adminClient.rpc("is_admin", { _user_id: caller.id });
    if (!isAdminResult) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, userId, fullName, email, roleId, departmentId, collegeId } = await req.json();

    if (action === "update") {
      if (!userId) {
        return new Response(JSON.stringify({ error: "userId is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update or create profile
      if (fullName || email) {
        const updates: Record<string, string | null> = {};
        if (fullName) updates.full_name = fullName;
        if (email) updates.email = email;

        const { data: existingProfile, error: profileLookupError } = await adminClient
          .from("profiles")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (profileLookupError) {
          return new Response(JSON.stringify({ error: profileLookupError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (existingProfile) {
          const { error: profileUpdateError } = await adminClient.from("profiles").update(updates).eq("user_id", userId);
          if (profileUpdateError) {
            return new Response(JSON.stringify({ error: profileUpdateError.message }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } else {
          const { error: profileInsertError } = await adminClient.from("profiles").insert({
            user_id: userId,
            full_name: fullName || "",
            email: email || null,
          });

          if (profileInsertError) {
            return new Response(JSON.stringify({ error: profileInsertError.message }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }

      // Update email in auth if changed
      if (email) {
        await adminClient.auth.admin.updateUserById(userId, { email });
      }

      // Update role if provided
      if (roleId) {
        await adminClient.from("user_roles").delete().eq("user_id", userId);
        await adminClient.from("user_roles").insert({ user_id: userId, role_id: roleId });
      }

      // Update department if provided
      if (departmentId !== undefined) {
        await adminClient.from("user_departments").delete().eq("user_id", userId);
        if (departmentId) {
          await adminClient.from("user_departments").insert({ user_id: userId, department_id: departmentId });
        }
      }

      // Update college if provided
      if (collegeId !== undefined) {
        await adminClient.from("user_colleges").delete().eq("user_id", userId);
        if (collegeId) {
          await adminClient.from("user_colleges").insert({ user_id: userId, college_id: collegeId });
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      if (!userId) {
        return new Response(JSON.stringify({ error: "userId is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Prevent self-deletion
      if (userId === caller.id) {
        return new Response(JSON.stringify({ error: "Cannot delete your own account" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete related records first
      await adminClient.from("user_roles").delete().eq("user_id", userId);
      await adminClient.from("user_departments").delete().eq("user_id", userId);
      await adminClient.from("user_colleges").delete().eq("user_id", userId);
      await adminClient.from("profiles").delete().eq("user_id", userId);

      // Delete auth user
      const { error } = await adminClient.auth.admin.deleteUser(userId);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use 'update' or 'delete'" }), {
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
