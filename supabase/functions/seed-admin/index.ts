import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  // Check if user already exists
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
  const existing = existingUsers?.users?.find((u: any) => u.email === "mesfen.megra@astu.edu.et");
  
  if (existing) {
    return new Response(JSON.stringify({ message: "Super admin already exists", userId: existing.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Create user
  const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
    email: "mesfen.megra@astu.edu.et",
    password: "12345678",
    email_confirm: true,
    user_metadata: { full_name: "Mesfen Megra" },
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = newUser.user.id;

  // Get super_admin role
  const { data: role } = await supabaseAdmin.from("roles").select("id").eq("name", "super_admin").single();
  
  if (role) {
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role_id: role.id });
  }

  return new Response(JSON.stringify({ success: true, userId }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
