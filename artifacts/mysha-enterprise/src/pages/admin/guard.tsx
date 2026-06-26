import { Link } from "wouter";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ShieldAlert, LogIn } from "lucide-react";

/**
 * Wraps the admin pages. Shows a sign-in prompt for guests and an access-denied
 * message for signed-in non-admin users. Renders children only for admins.
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, refreshUser } = useAuth();

  // Re-check the session on mount so admin status is fresh.
  useEffect(() => { refreshUser(); }, [refreshUser]);

  if (loading && !user) {
    return (
      <div className="container mx-auto px-4 py-24 text-center text-gray-400">
        Checking access…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-24 max-w-md text-center">
        <div className="w-14 h-14 rounded-full bg-orange-50 text-primary flex items-center justify-center mx-auto mb-4">
          <LogIn size={26} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Sign in required</h2>
        <p className="text-sm text-gray-500 mb-6">You need to sign in with an admin account to manage products.</p>
        <Link href="/signin"><Button>Go to Sign In</Button></Link>
      </div>
    );
  }

  if (!user.isAdmin) {
    return (
      <div className="container mx-auto px-4 py-24 max-w-md text-center">
        <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert size={26} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Access denied</h2>
        <p className="text-sm text-gray-500 mb-2">
          Your account (<span className="font-medium">{user.email}</span>) is not an admin.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Ask the site owner to add your email to <code className="bg-gray-100 px-1 rounded">ADMIN_EMAILS</code>.
        </p>
        <Link href="/"><Button variant="outline">Back to Store</Button></Link>
      </div>
    );
  }

  return <>{children}</>;
}
