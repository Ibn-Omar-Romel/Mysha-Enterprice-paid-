import { useState, useRef, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Mail, RefreshCw, CheckCircle2, FlaskConical, Copy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function VerifyEmailPage() {
  const [, setLocation] = useLocation();
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const email = params.get("email") || "";
  const type = params.get("type") || "signup";
  const devCode = params.get("devCode") || "";

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { saveUser } = useAuth();

  useEffect(() => {
    if (devCode && devCode.length === 6) {
      setCode(devCode.split(""));
      inputRefs.current[5]?.focus();
    } else {
      inputRefs.current[0]?.focus();
    }
  }, []);

  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [resendCooldown]);

  const handleChange = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...code];
    next[idx] = val.slice(-1);
    setCode(next);
    if (val && idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = [...code];
    pasted.split("").forEach((ch, i) => { next[i] = ch; });
    setCode(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const fullCode = code.join("");

  const handleVerify = async () => {
    if (fullCode.length < 6) {
      toast.error("Please enter the full 6-digit code");
      return;
    }
    setLoading(true);
    try {
      const endpoint = type === "reset" ? "/api/auth/verify-reset-code" : "/api/auth/verify-email";
      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: fullCode }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "Invalid or expired code");
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        return;
      }
      if (type === "reset") {
        toast.success("Code verified! Set your new password.");
        setLocation(`/reset-password?email=${encodeURIComponent(email)}&code=${fullCode}`);
      } else {
        saveUser(result.user);
        toast.success("Email verified! Welcome to Mysha Enterprise.");
        setLocation("/");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const endpoint = type === "reset" ? "/api/auth/forgot-password" : "/api/auth/resend-code";
      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "Failed to resend code");
        return;
      }
      toast.success("A new code has been sent to your email");
      if (result.devCode) toast.info(`Dev code: ${result.devCode}`, { duration: 15000 });
      setResendCooldown(60);
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch {
      toast.error("Failed to resend code");
    } finally {
      setResending(false);
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
        </div>

        <div className="bg-white rounded-2xl border p-8 shadow-sm text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <Mail size={28} className="text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {type === "reset" ? "Reset Password" : "Verify Your Email"}
          </h1>
          <p className="text-gray-500 text-sm mb-1">
            We sent a 6-digit code to
          </p>
          <p className="font-semibold text-gray-800 mb-6">{email}</p>

          {/* Dev Code Banner — only shown when SMTP is not configured */}
          {devCode && (
            <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm mb-2">
                <FlaskConical size={15} />
                Email not configured — use this code
              </div>
              <div className="flex items-center justify-between gap-3 bg-white border border-amber-200 rounded-lg px-4 py-2">
                <span className="text-2xl font-bold tracking-[0.3em] text-amber-700">{devCode}</span>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(devCode);
                    toast.success("Code copied!");
                  }}
                  className="text-amber-500 hover:text-amber-700 transition-colors"
                  title="Copy code"
                >
                  <Copy size={16} />
                </button>
              </div>
              <p className="text-xs text-amber-600 mt-2">The code above has been auto-filled below.</p>
            </div>
          )}

          {/* Code Inputs */}
          <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
            {code.map((digit, idx) => (
              <input
                key={idx}
                ref={el => { inputRefs.current[idx] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(idx, e.target.value)}
                onKeyDown={e => handleKeyDown(idx, e)}
                className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-xl outline-none transition-all
                  ${digit ? "border-primary bg-primary/5 text-primary" : "border-gray-200 focus:border-primary"}
                  focus:ring-2 focus:ring-primary/20`}
              />
            ))}
          </div>

          <Button
            className="w-full h-11 font-semibold mb-4"
            onClick={handleVerify}
            disabled={loading || fullCode.length < 6}
          >
            {loading
              ? <><Loader2 size={16} className="mr-2 animate-spin" /> Verifying…</>
              : <><CheckCircle2 size={16} className="mr-2" /> Verify Code</>
            }
          </Button>

          <div className="text-sm text-gray-500">
            Didn't receive the code?{" "}
            <button
              onClick={handleResend}
              disabled={resending || resendCooldown > 0}
              className="text-primary font-semibold hover:underline disabled:opacity-50 disabled:no-underline inline-flex items-center gap-1"
            >
              {resending
                ? <><RefreshCw size={12} className="animate-spin" /> Sending…</>
                : resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : "Resend code"
              }
            </button>
          </div>
        </div>

        <div className="text-center mt-5">
          <Link href="/signin" className="text-sm text-gray-400 hover:text-primary transition-colors">
            ← Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
