import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { isAdmin, canApproveReports, canViewReports } from "@/lib/auth";
import {
  LayoutDashboard, FileText, CheckSquare, Building2, Users,
  Bell, LogOut, Menu, X, BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import astuLogo from "@/assets/astu-logo.png";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Redirect to change password if required
  if (user?.profile?.must_change_password) {
    navigate({ to: "/change-password" });
    return null;
  }

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-notifications", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  const roleLabel = user?.roles[0]?.replace("_", " ") || "User";

  const navItems = [
    { to: "/dashboard" as const, icon: LayoutDashboard, label: "Dashboard", show: true },
    { to: "/reports" as const, icon: FileText, label: "Reports", show: canViewReports(user) },
    { to: "/approvals" as const, icon: CheckSquare, label: "Approvals", show: canApproveReports(user) },
    { to: "/analytics" as const, icon: BarChart3, label: "Analytics", show: true },
    { to: "/organization" as const, icon: Building2, label: "Organization", show: isAdmin(user) },
    { to: "/users" as const, icon: Users, label: "Users", show: isAdmin(user) },
    { to: "/notifications" as const, icon: Bell, label: "Notifications", show: true },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:relative lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
            <Link
              to="/dashboard"
              className="flex items-center gap-3"
              onClick={() => setSidebarOpen(false)}
            >
              <img src={astuLogo} alt="ASTU Logo" className="h-9 w-9 rounded-full" />
              <div>
                <h1 className="text-sm font-bold tracking-tight">ClassReport</h1>
                <p className="text-[10px] uppercase tracking-widest text-sidebar-foreground/60">ASTU</p>
              </div>
            </Link>
            <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.filter(n => n.show).map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                activeProps={{ className: "bg-sidebar-accent text-sidebar-foreground" }}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {item.label === "Notifications" && unreadCount > 0 && (
                  <Badge className="ml-auto h-5 min-w-5 justify-center rounded-full bg-destructive px-1.5 text-[10px] text-destructive-foreground">
                    {unreadCount}
                  </Badge>
                )}
              </Link>
            ))}
          </nav>

          {/* User */}
          <div className="border-t border-sidebar-border px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold uppercase">
                {user?.profile?.full_name?.[0] || user?.email?.[0] || "U"}
              </div>
              <div className="flex-1 truncate">
                <p className="truncate text-sm font-medium">{user?.profile?.full_name || "User"}</p>
                <p className="truncate text-[10px] capitalize text-sidebar-foreground/50">{roleLabel}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleSignOut} className="h-8 w-8 text-sidebar-foreground/50 hover:text-sidebar-foreground">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-6">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <Link to="/notifications">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] text-destructive-foreground">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
