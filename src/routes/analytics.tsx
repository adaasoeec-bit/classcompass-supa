import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, Legend } from "recharts";
import { isAdmin, hasRole } from "@/lib/auth";
import { TrendingUp, Users, CalendarDays, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  if (!user) return null;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance Analytics</h1>
          <p className="text-sm text-muted-foreground">Track attendance patterns and trends</p>
        </div>
        <AnalyticsContent />
      </div>
    </AppLayout>
  );
}

function AnalyticsContent() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<"7" | "30" | "90">("30");

  const { data } = useQuery({
    queryKey: ["analytics", user?.id, period],
    queryFn: async () => {
      const daysAgo = new Date(Date.now() - parseInt(period) * 86400000).toISOString().split("T")[0];

      let query = supabase.from("class_reports").select("*").gte("report_date", daysAgo).order("report_date");
      if (hasRole(user, "instructor") && !isAdmin(user) && !hasRole(user, "department_head")) {
        query = query.eq("instructor_id", user!.id);
      }

      const { data: reports } = await query;
      if (!reports || reports.length === 0) return { daily: [], weekly: [], summary: { totalPresent: 0, totalAbsent: 0, totalClasses: 0, avgRate: 0 } };

      // Daily aggregation
      const dailyMap: Record<string, { present: number; absent: number; total: number; count: number }> = {};
      let totalPresent = 0, totalAbsent = 0, totalClasses = reports.length;

      for (const r of reports) {
        const day = r.report_date;
        if (!dailyMap[day]) dailyMap[day] = { present: 0, absent: 0, total: 0, count: 0 };
        dailyMap[day].present += r.students_present;
        dailyMap[day].absent += r.students_absent;
        dailyMap[day].total += r.students_total;
        dailyMap[day].count += 1;
        totalPresent += r.students_present;
        totalAbsent += r.students_absent;
      }

      const daily = Object.entries(dailyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({
          date: new Date(date).toLocaleDateString("en", { month: "short", day: "numeric" }),
          present: v.present,
          absent: v.absent,
          rate: v.total > 0 ? Math.round((v.present / v.total) * 100) : 0,
          classes: v.count,
        }));

      // Weekly aggregation
      const weeklyMap: Record<string, { present: number; absent: number; total: number }> = {};
      for (const r of reports) {
        const d = new Date(r.report_date);
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        const key = weekStart.toISOString().split("T")[0];
        if (!weeklyMap[key]) weeklyMap[key] = { present: 0, absent: 0, total: 0 };
        weeklyMap[key].present += r.students_present;
        weeklyMap[key].absent += r.students_absent;
        weeklyMap[key].total += r.students_total;
      }

      const weekly = Object.entries(weeklyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({
          week: `W${new Date(date).toLocaleDateString("en", { month: "short", day: "numeric" })}`,
          present: v.present,
          absent: v.absent,
          rate: v.total > 0 ? Math.round((v.present / v.total) * 100) : 0,
        }));

      const totalStudents = totalPresent + totalAbsent;
      return {
        daily,
        weekly,
        summary: {
          totalPresent,
          totalAbsent,
          totalClasses,
          avgRate: totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0,
        },
      };
    },
    enabled: !!user,
  });

  const summary = data?.summary || { totalPresent: 0, totalAbsent: 0, totalClasses: 0, avgRate: 0 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Select value={period} onValueChange={(v) => setPeriod(v as "7" | "30" | "90")}>
          <SelectTrigger className="w-[160px]">
            <CalendarDays className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 Days</SelectItem>
            <SelectItem value="30">Last 30 Days</SelectItem>
            <SelectItem value="90">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={BarChart3} label="Total Classes" value={summary.totalClasses} />
        <SummaryCard icon={Users} label="Total Present" value={summary.totalPresent} />
        <SummaryCard icon={Users} label="Total Absent" value={summary.totalAbsent} />
        <SummaryCard icon={TrendingUp} label="Avg Attendance" value={`${summary.avgRate}%`} />
      </div>

      {/* Daily Trend */}
      <Card className="stat-card-shadow">
        <CardHeader><CardTitle className="text-base">Daily Attendance Trend</CardTitle></CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.daily || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="present" name="Present" fill="var(--color-success)" stroke="var(--color-success)" fillOpacity={0.3} />
                <Area type="monotone" dataKey="absent" name="Absent" fill="var(--color-destructive)" stroke="var(--color-destructive)" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Rate & Weekly */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="stat-card-shadow">
          <CardHeader><CardTitle className="text-base">Attendance Rate (%)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.daily || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="rate" name="Rate %" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card-shadow">
          <CardHeader><CardTitle className="text-base">Weekly Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.weekly || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="week" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="present" name="Present" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="absent" name="Absent" fill="var(--color-destructive)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }: { icon: any; label: string; value: number | string }) {
  return (
    <Card className="stat-card-shadow">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
