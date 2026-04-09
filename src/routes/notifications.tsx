import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  if (!user) return null;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
            <p className="text-sm text-muted-foreground">Stay updated on report activity</p>
          </div>
          <MarkAllReadButton />
        </div>
        <NotificationsList />
      </div>
    </AppLayout>
  );
}

function MarkAllReadButton() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const markAll = useMutation({
    mutationFn: async () => {
      await supabase.from("notifications").update({ is_read: true }).eq("user_id", user!.id).eq("is_read", false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
    },
  });

  return (
    <Button variant="outline" size="sm" onClick={() => markAll.mutate()}>
      <CheckCheck className="mr-1.5 h-3.5 w-3.5" /> Mark all read
    </Button>
  );
}

function NotificationsList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!user,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
    },
  });

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Loading...</div>;

  if (!notifications?.length) {
    return (
      <Card className="stat-card-shadow">
        <CardContent className="flex flex-col items-center gap-3 py-12">
          <Bell className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No notifications yet</p>
        </CardContent>
      </Card>
    );
  }

  const typeColor: Record<string, string> = {
    info: "default",
    success: "default",
    warning: "secondary",
    error: "destructive",
  };

  return (
    <div className="space-y-2">
      {notifications.map((n: any) => (
        <Card key={n.id} className={`stat-card-shadow transition-colors ${!n.is_read ? "border-l-2 border-l-primary" : ""}`}>
          <CardContent className="flex items-start gap-3 p-4">
            <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${n.is_read ? "bg-muted" : "bg-primary"}`} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{n.title}</p>
                <Badge variant={typeColor[n.type] as any} className="text-[10px]">{n.type}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{n.message}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {new Date(n.created_at).toLocaleString()}
              </p>
            </div>
            {!n.is_read && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => markRead.mutate(n.id)}>
                <Check className="h-3.5 w-3.5" />
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
