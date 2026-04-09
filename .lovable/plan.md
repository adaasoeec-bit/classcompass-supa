

## Problem

The users list query fails with a 400 error because PostgREST cannot resolve the join between `profiles` and `user_roles` -- there are no foreign key relationships between these tables. The `profiles`, `user_roles`, `user_departments`, and `user_colleges` tables all have a `user_id` column but no FK constraints linking them.

## Solution

Two changes are needed:

### 1. Database Migration -- Add Foreign Keys

Add foreign key constraints so PostgREST can resolve the relationships:

- `user_roles.user_id` -> `profiles.user_id`  (or use `auth.users.id` -- but since we query via profiles, we need the link to profiles)
- `user_departments.user_id` -> `profiles.user_id`
- `user_colleges.user_id` -> `profiles.user_id`

Actually, the simpler fix: change the query approach to avoid nested joins through profiles. Instead, fetch profiles separately and then fetch roles/departments/colleges in separate queries keyed by `user_id`.

**Better approach**: Since PostgREST needs FK relationships for embedded queries, we should split the query in `UsersList`:

1. Fetch all profiles
2. Fetch all user_roles with roles joined (this works since `user_roles` likely has a FK to `roles`)
3. Fetch all user_departments and user_colleges
4. Join them client-side by `user_id`

### 2. Update `src/routes/users.tsx` -- Fix UsersList Query

Replace the single nested query with separate queries and client-side joining:

```typescript
// Fetch profiles
const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });

// Fetch all user roles with role names
const { data: allUserRoles } = await supabase.from("user_roles").select("user_id, role_id, roles(name)");

// Fetch departments and colleges assignments
const { data: allUserDepts } = await supabase.from("user_departments").select("user_id, department_id");
const { data: allUserColleges } = await supabase.from("user_colleges").select("user_id, college_id");

// Merge client-side
return (profiles || []).map(p => ({
  ...p,
  user_roles: (allUserRoles || []).filter(r => r.user_id === p.user_id),
  user_departments: (allUserDepts || []).filter(d => d.user_id === p.user_id),
  user_colleges: (allUserColleges || []).filter(c => c.user_id === p.user_id),
}));
```

This avoids the need for FK constraints between profiles and the junction tables, and will correctly display all added users with their roles.

## Files Changed

- `src/routes/users.tsx` -- Update the `UsersList` query function to use separate queries with client-side joining

