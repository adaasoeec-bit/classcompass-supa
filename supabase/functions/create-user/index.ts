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
    // Verify the caller is authenticated and is an admin
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Environment variables are configured as Edge Function secrets.
    // Supabase does not allow secrets starting with the SUPABASE_ prefix,
    // so we use neutral names here (PROJECT_URL, ANON_KEY, SERVICE_ROLE_KEY).
    const supabaseUrl = Deno.env.get("PROJECT_URL")!;
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY")!;
    const publishableKey = Deno.env.get("ANON_KEY")!;

    // Create a client with the caller's token to check admin status
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

    // Check if caller is admin using the admin client
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

    // Parse request body
    const { email, fullName, roleId, departmentId, collegeId } = await req.json();

    if (!email || !fullName || !roleId) {
      return new Response(JSON.stringify({
        error: "Email, fullName, and roleId are required",
        stage: "validate_input",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate role exists early for clearer errors
    const { data: roleRow, error: roleLookupError } = await adminClient
      .from("roles")
      .select("id")
      .eq("id", roleId)
      .maybeSingle();

    if (roleLookupError || !roleRow) {
      return new Response(JSON.stringify({
        error: "Selected role does not exist",
        stage: "validate_role",
        details: roleLookupError,
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user with default password, or reuse existing user if email already exists.
    let userId: string | undefined;
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: "12345678",
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError) {
      const createMsg = createError.message?.toLowerCase() || "";
      const isDuplicateEmail =
        createMsg.includes("already") ||
        createMsg.includes("registered") ||
        createMsg.includes("exists") ||
        createMsg.includes("duplicate");

      if (!isDuplicateEmail) {
        return new Response(JSON.stringify({
          error: createError.message,
          stage: "auth_create_user",
          details: createError,
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Try to resolve existing user by email.
      const { data: usersPage, error: listUsersError } = await adminClient.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      if (listUsersError) {
        return new Response(JSON.stringify({
          error: listUsersError.message,
          stage: "lookup_existing_user",
          details: listUsersError,
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const existingUser = usersPage.users.find((u) => (u.email || "").toLowerCase() === email.toLowerCase());
      if (!existingUser) {
        return new Response(JSON.stringify({
          error: "User appears to exist, but could not be resolved by email",
          stage: "lookup_existing_user",
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      userId = existingUser.id;
    } else {
      userId = newUser.user.id;
    }

    // Avoid duplicate-key races with the auth.users -> profiles trigger.
    // We only update profile fields if the row already exists.
    const { error: profileUpdateError } = await adminClient
      .from("profiles")
      .update({
        full_name: fullName,
        email,
        must_change_password: true,
      })
      .eq("user_id", userId);

    if (profileUpdateError) {
      return new Response(JSON.stringify({
        error: profileUpdateError.message,
        stage: "profile_update",
        details: profileUpdateError,
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Assign role
    const { error: roleError } = await adminClient.from("user_roles").upsert(
      {
        user_id: userId,
        role_id: roleId,
      },
      { onConflict: "user_id,role_id" }
    );
    if (roleError) {
      return new Response(JSON.stringify({
        error: roleError.message,
        stage: "assign_role",
        details: roleError,
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Assign department if provided
    if (departmentId) {
      await adminClient.from("user_departments").upsert(
        {
          user_id: userId,
          department_id: departmentId,
        },
        { onConflict: "user_id,department_id" }
      );
    }

    // Assign college if provided
    if (collegeId) {
      await adminClient.from("user_colleges").upsert(
        {
          user_id: userId,
          college_id: collegeId,
        },
        { onConflict: "user_id,college_id" }
      );
    }

    return new Response(JSON.stringify({ success: true, userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({
      error: (err as Error).message,
      stage: "unhandled_exception",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
