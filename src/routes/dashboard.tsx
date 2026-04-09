import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { isAdmin, canApproveReports, canCreateReports } from "@/lib/auth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckSquare, Clock, AlertTriangle, TrendingUp, Users, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  if (!user) return null;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back, {user.profile?.full_name || "User"}
          </p>
        </div>
        <DashboardContent />
      </div>
    </AppLayout>
  );
}

function DashboardContent() {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

      let reportsQuery = supabase.from("class_reports").select("*", { count: "exact" });

      const [totalReports, todayReports, pendingApprovals, weekReports] = await Promise.all([
        reportsQuery,
        supabase.from("class_reports").select("*", { count: "exact" }).eq("report_date", today),
        supabase.from("class_reports").select("*", { count: "exact" }).eq("status", "submitted"),
        supabase.from("class_reports").select("*").gte("report_date", weekAgo),
      ]);

      const weekData = (weekReports.data || []).reduce((acc: Record<string, number>, r) => {
        const day = new Date(r.report_date).toLocaleDateString("en", { weekday: "short" });
        acc[day] = (acc[day] || 0) + 1;
        return acc;
      }, {});

      const statusData = (totalReports.data || []).reduce((acc: Record<string, number>, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      }, {});

      return {
        total: totalReports.count || 0,
        today: todayReports.count || 0,
        pending: pendingApprovals.count || 0,
        weekChart: Object.entries(weekData).map(([name, value]) => ({ name, value })),
        statusChart: Object.entries(statusData).map(([name, value]) => ({ name, value })),
      };
    },
    enabled: !!user,
  });

  const COLORS = ["oklch(0.45 0.18 250)", "oklch(0.52 0.17 155)", "oklch(0.75 0.18 75)", "oklch(0.577 0.245 27)"];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FileText} label="Total Reports" value={stats?.total || 0} color="primary" />
        <StatCard icon={Clock} label="Today's Reports" value={stats?.today || 0} color="chart-2" />
        <StatCard icon={CheckSquare} label="Pending Approval" value={stats?.pending || 0} color="warning" />
        <StatCard icon={TrendingUp} label="This Week" value={stats?.weekChart?.reduce((s, d) => s + d.value, 0) || 0} color="chart-5" />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="stat-card-shadow">
          <CardHeader>
            <CardTitle className="text-base">Weekly Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.weekChart || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="value" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card-shadow">
          <CardHeader>
            <CardTitle className="text-base">Report Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.statusChart || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {(stats?.statusChart || []).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="stat-card-shadow">
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {canCreateReports(user) && (
            <Link to="/reports">
              <Badge variant="secondary" className="cursor-pointer px-4 py-2 text-sm hover:bg-accent">
                <FileText className="mr-2 h-3.5 w-3.5" /> Submit Report
              </Badge>
            </Link>
          )}
          {canApproveReports(user) && (
            <Link to="/approvals">
              <Badge variant="secondary" className="cursor-pointer px-4 py-2 text-sm hover:bg-accent">
                <CheckSquare className="mr-2 h-3.5 w-3.5" /> Review Approvals
              </Badge>
            </Link>
          )}
          {isAdmin(user) && (
            <Link to="/organization">
              <Badge variant="secondary" className="cursor-pointer px-4 py-2 text-sm hover:bg-accent">
                <Building2 className="mr-2 h-3.5 w-3.5" /> Manage Organization
              </Badge>
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <Card className="stat-card-shadow">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-${color}/10`}>
          <Icon className={`h-5 w-5 text-${color}`} />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
