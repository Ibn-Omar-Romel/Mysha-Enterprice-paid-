import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { Loader2, KeyRound } from "lucide-react";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export default function ForgotPasswordPage() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: z.infer<typeof schema>) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "Failed to send reset code");
        return;
      }
      setSentEmail(data.email);
      setSent(true);
      if (result.devCode) toast.info(`Dev code: ${result.devCode}`, { duration: 15000 });
      toast.success("Reset code sent to your email");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center font-bold text-xl text-white">M</div>
            <span className="text-2xl font-bold">Mysha<span className="text-primary">Enterprise</span></span>
          </Link>
          <div className="bg-white rounded-2xl border p-8 shadow-sm">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <KeyRound size={28} className="text-green-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Check your email</h1>
            <p className="text-gray-500 text-sm mb-6">
              We sent a 6-digit reset code to <strong className="text-gray-800">{sentEmail}</strong>
            </p>
            <Button
              className="w-full h-11 font-semibold"
              onClick={() => setLocation(`/verify-email?email=${encodeURIComponent(sentEmail)}&type=reset`)}
            >
              Enter Reset Code
            </Button>
            <p className="text-sm text-gray-400 mt-4">
              Didn't get it?{" "}
              <button onClick={() => setSent(false)} className="text-primary hover:underline font-medium">
                Try again
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center font-bold text-xl text-white">M</div>
            <span className="text-2xl font-bold">Mysha<span className="text-primary">Enterprise</span></span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Forgot your password?</h1>
          <p className="text-gray-500 mt-1 text-sm">Enter your email and we'll send you a reset code</p>
        </div>

        <div className="bg-white rounded-2xl border p-8 shadow-sm">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
                {loading ? <><Loader2 size={16} className="mr-2 animate-spin" /> Sending code…</> : "Send Reset Code"}
              </Button>
            </form>
          </Form>

          <div className="mt-5 text-center">
            <Link href="/signin" className="text-sm text-gray-500 hover:text-primary transition-colors">
              ← Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
