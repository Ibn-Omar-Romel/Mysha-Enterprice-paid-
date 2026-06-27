import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, ShieldCheck, Lock } from "lucide-react";

// Dedicated admin sign-in: predefined accounts only — no sign-up, no forgot-password.
export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { saveUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) { toast.error("Enter your email and password."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Sign in failed"); return; }
      if (!data.user?.isAdmin) { toast.error("This account is not an admin."); return; }
      saveUser(data.user);
      toast.success(`Welcome, ${data.user.name}`);
      setLocation("/admin");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center font-bold text-xl text-white">M</div>
            <span className="text-2xl font-bold">Mysha<span className="text-primary">Enterprise</span></span>
          </Link>
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3"><Lock size={22} /></div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Sign In</h1>
          <p className="text-gray-500 mt-1">Authorized staff only</p>
        </div>

        <div className="bg-white rounded-2xl border p-8 shadow-sm">
          <form onSubmit={submit} className="space-y-5">
            <div>
              <Label className="mb-1.5 block">Email</Label>
              <Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@email.com" />
            </div>
            <div>
              <Label className="mb-1.5 block">Password</Label>
              <div className="relative">
                <Input type={show ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pr-10" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setShow(!show)}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
              {loading ? <><Loader2 size={16} className="mr-2 animate-spin" /> Signing in…</> : "Sign In"}
            </Button>
          </form>
        </div>

        <div className="mt-6 flex items-center gap-2 text-xs text-gray-400 justify-center">
          <ShieldCheck size={13} /> Admin accounts are created by the owner only
        </div>
      </div>
    </div>
  );
}
