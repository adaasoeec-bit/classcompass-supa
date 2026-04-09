import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import astuLogo from "@/assets/astu-logo.png";

export const Route = createFileRoute("/register/$token")({
  component: InviteRegisterPage,
});

function InviteRegisterPage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const { data: invite, isLoading: inviteLoading } = useQuery({
    queryKey: ["invite", token],
    queryFn: async () => {
      const { data } = await supabase
        .from("invite_links")
        .select("*, roles(name)")
        .eq("token", token)
        .eq("is_active", true)
        .single();
      return data;
    },
  });

  if (inviteLoading) return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  if (!invite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <p className="text-destructive font-medium">Invalid or expired invitation link.</p>
            <p className="text-sm text-muted-foreground mt-2">Please contact your administrator for a new link.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const registerEmail = invite.email || email;
    const { error: signUpError } = await supabase.auth.signUp({
      email: registerEmail,
      password,
      options: { data: { full_name: fullName, invite_token: token } },
    });

    if (signUpError) {
      setError(signUpError.message);
    } else {
      setSuccess("Account created! Check your email to verify, then sign in.");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3">
          <img src={astuLogo} alt="ASTU Logo" className="h-16 w-16 rounded-full" />
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Join ClassReport</h1>
            <p className="text-sm text-muted-foreground">You've been invited as <span className="font-medium capitalize text-foreground">{(invite.roles as any)?.name?.replace("_", " ") || "User"}</span></p>
          </div>
        </div>

        <Card className="stat-card-shadow">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Create Your Account</CardTitle>
            <CardDescription>Complete registration to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" required />
              </div>
              {!invite.email && (
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@university.edu" required />
                </div>
              )}
              {invite.email && (
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={invite.email} disabled />
                </div>
              )}
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
              </div>
              {error && <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
              {success && <div className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">{success}</div>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Account
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
