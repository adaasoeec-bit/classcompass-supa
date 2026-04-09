import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

const createUserSchema = z.object({
  email: z.string().email().max(255),
  fullName: z.string().min(1).max(255),
  roleId: z.string().uuid(),
  departmentId: z.string().uuid().optional(),
  collegeId: z.string().uuid().optional(),
});

export const createUserFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.infer<typeof createUserSchema>) => createUserSchema.parse(input))
  .handler(async ({ data, context }) => {
    // Verify caller is admin
    const { data: isAdminResult } = await supabaseAdmin.rpc("is_admin", { _user_id: context.userId });
    if (!isAdminResult) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Create user with default password
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: "12345678",
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });

    if (createError) throw new Error(createError.message);
    if (!newUser.user) throw new Error("Failed to create user");

    const userId = newUser.user.id;

    // Set must_change_password flag
    await supabaseAdmin.from("profiles").update({ must_change_password: true }).eq("user_id", userId);

    // Assign role
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      role_id: data.roleId,
    });
    if (roleError) throw new Error(roleError.message);

    // Assign department if provided
    if (data.departmentId) {
      await supabaseAdmin.from("user_departments").insert({
        user_id: userId,
        department_id: data.departmentId,
      });
    }

    // Assign college if provided
    if (data.collegeId) {
      await supabaseAdmin.from("user_colleges").insert({
        user_id: userId,
        college_id: data.collegeId,
      });
    }

    return { success: true, userId };
  });
